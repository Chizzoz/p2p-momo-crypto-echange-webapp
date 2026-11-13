import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import InputLabel from './InputLabel';
import TextInput from './TextInput';
import InputError from './InputError';
import SecondaryButton from './SecondaryButton';
import classNames from 'classnames';
import { useForm } from '@inertiajs/inertia-react';
import useTypedPage from '@/Hooks/useTypedPage';
import { chainConfig } from '@/lib/chain';
import {
  assertDepositAllowed,
  assertUsdtBalance,
  ensureUsdtAllowance,
  formatTxError,
  getBrowserProvider,
  getBrowserSigner,
  getEmpiyaP2P,
  getUsdtBalance,
  UserFacingTxError,
} from '@/lib/contracts';
import { detectMsisdn, formatMsisdnDisplay } from '@/lib/msisdn';
import { formatUsdt, parseUsdt } from '@/lib/units';
import { CountryOption, PaymentMethodOption } from '@/types';

type CreateTransactionModalProps = {
  modalOpen: boolean;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

type TokenProps = {
  id: number;
  token: string;
  symbol: string;
  token_slug: string;
};

export default function CreateTransactionModal({
  modalOpen,
  setModalOpen,
}: CreateTransactionModalProps) {
  const page = useTypedPage();
  const user = page.props.user;
  const tokens: TokenProps[] = (page.props.tokens as TokenProps[]) || [];
  const countries: CountryOption[] =
    (page.props.countries as CountryOption[]) || [];
  const paymentMethods: PaymentMethodOption[] =
    (page.props.payment_methods as PaymentMethodOption[]) || [];

  const profileMobile = user?.mobile_number || '';
  const profileCountry = useMemo(
    () =>
      countries.find(country => country.id === user?.country_id) || null,
    [countries, user?.country_id],
  );
  const profileNetwork = useMemo(
    () =>
      paymentMethods.find(method => method.id === user?.payment_method_id) ||
      null,
    [paymentMethods, user?.payment_method_id],
  );
  const hasBoundMomo = Boolean(
    profileMobile && profileCountry && profileNetwork,
  );

  const form = useForm({
    amount: '0',
    token: undefined as string | undefined,
    momo_payment: profileNetwork?.method_slug || '',
    recipient_mobile: '',
    recipient_country_iso3: profileCountry?.iso3 || 'ZMB',
    price: 0 as number | string,
  });

  const cancelButtonRef = useRef(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusTone, setStatusTone] = useState<'info' | 'success' | 'error'>(
    'info',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableBalance, setAvailableBalance] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string>('');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const recipientDetection = useMemo(() => {
    if (hasBoundMomo) {
      return null;
    }
    return form.data.recipient_mobile
      ? detectMsisdn(
          form.data.recipient_mobile,
          form.data.recipient_country_iso3 || 'ZMB',
        )
      : null;
  }, [
    hasBoundMomo,
    form.data.recipient_mobile,
    form.data.recipient_country_iso3,
  ]);

  const selectedCountryIso3 =
    (hasBoundMomo ? profileCountry?.iso3 : null) ||
    recipientDetection?.countryIso3 ||
    form.data.recipient_country_iso3 ||
    'ZMB';

  const selectedCountry = countries.find(
    country => country.iso3 === selectedCountryIso3,
  );

  const networksForCountry = useMemo(() => {
    if (!selectedCountry) {
      return [] as PaymentMethodOption[];
    }
    return paymentMethods.filter(
      method => method.country_id === selectedCountry.id,
    );
  }, [paymentMethods, selectedCountry]);

  function setProgress(message: string) {
    setStatusTone('info');
    setStatusMessage(message);
  }

  // Prefer bound profile MNO; otherwise suggest from typed number.
  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    if (hasBoundMomo && profileNetwork) {
      if (form.data.momo_payment !== profileNetwork.method_slug) {
        form.setData('momo_payment', profileNetwork.method_slug);
      }
      return;
    }

    const suggested = recipientDetection?.suggestedMethodSlug;
    if (
      suggested &&
      networksForCountry.some(method => method.method_slug === suggested)
    ) {
      if (form.data.momo_payment !== suggested) {
        form.setData('momo_payment', suggested);
      }
      return;
    }

    if (
      form.data.momo_payment &&
      !networksForCountry.some(
        method => method.method_slug === form.data.momo_payment,
      )
    ) {
      form.setData('momo_payment', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    modalOpen,
    hasBoundMomo,
    profileNetwork?.method_slug,
    recipientDetection?.suggestedMethodSlug,
    selectedCountryIso3,
    networksForCountry,
  ]);

  // Keep country selector in sync when detection finds a country.
  useEffect(() => {
    if (hasBoundMomo || !recipientDetection?.countryIso3) {
      return;
    }
    if (form.data.recipient_country_iso3 !== recipientDetection.countryIso3) {
      form.setData('recipient_country_iso3', recipientDetection.countryIso3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBoundMomo, recipientDetection?.countryIso3]);

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    let cancelled = false;

    async function loadBalance() {
      setIsLoadingBalance(true);
      setBalanceError('');
      try {
        const provider = getBrowserProvider();
        const accounts: string[] = await provider.send('eth_accounts', []);
        const address =
          accounts[0] ||
          (await (async () => {
            const signer = await getBrowserSigner();
            return signer.getAddress();
          })());
        const balance = await getUsdtBalance(address, provider);
        if (!cancelled) {
          setAvailableBalance(formatUsdt(balance));
        }
      } catch (error: any) {
        if (!cancelled) {
          setAvailableBalance(null);
          setBalanceError(
            formatTxError(error) ||
              'Could not load USDT balance. Connect MetaMask on Sepolia.',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingBalance(false);
        }
      }
    }

    loadBalance();

    return () => {
      cancelled = true;
    };
  }, [modalOpen]);

  async function submitTransactionDetails() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setStatusTone('info');
    setStatusMessage('');
    try {
      const amount = parseUsdt(form.data.amount);
      if (amount.lte(0)) {
        throw new UserFacingTxError('Enter a USDT amount greater than zero.');
      }

      const recipientNumber = hasBoundMomo
        ? profileMobile
        : form.data.recipient_mobile.trim();

      if (!recipientNumber) {
        throw new UserFacingTxError(
          'Add a mobile money number on your profile, or enter a recipient number for this listing.',
        );
      }

      if (!hasBoundMomo && !form.data.recipient_country_iso3) {
        throw new UserFacingTxError(
          'Select the recipient country for this mobile number.',
        );
      }

      if (!form.data.momo_payment) {
        throw new UserFacingTxError(
          'Select the recipient mobile network (MNO).',
        );
      }

      const signer = await getBrowserSigner();
      const sellerAddress = await signer.getAddress();
      const empiyaP2P = getEmpiyaP2P(signer);
      const p2pAddress = chainConfig.empiyaP2P();

      setProgress('Checking USDT balance…');
      const balance = await assertUsdtBalance(sellerAddress, amount, signer);
      setAvailableBalance(formatUsdt(balance));
      await assertDepositAllowed(amount, signer);

      setProgress('Checking USDT allowance…');
      await ensureUsdtAllowance(sellerAddress, p2pAddress, amount, signer);

      setProgress('Confirm approve & deposit in MetaMask…');
      const tx = await empiyaP2P.deposit(amount);
      setProgress('Waiting for deposit confirmation…');
      const receipt = await tx.wait();

      const txs = await empiyaP2P.getUserTransactions();
      const lastKey = txs.length > 0 ? txs.length - 1 : undefined;
      const last = lastKey !== undefined ? txs[lastKey] : undefined;

      const refreshed = await getUsdtBalance(sellerAddress, signer);
      setAvailableBalance(formatUsdt(refreshed));

      setStatusTone('success');
      setStatusMessage(
        `Deposit confirmed${last?.transactionNumber ? ` (${last.transactionNumber})` : ''}. Tx: ${receipt.transactionHash}`,
      );
      console.log('deposit receipt', {
        receipt,
        transactionKey: lastKey,
        transactionNumber: last?.transactionNumber,
        reservationId: last?.reservationId?.toString?.(),
        reservedAt: last?.reservedAt?.toString?.(),
        recipientMobile: hasBoundMomo
          ? formatMsisdnDisplay(profileMobile) || profileMobile
          : formatMsisdnDisplay(recipientNumber) || recipientNumber,
        recipientCountry: selectedCountryIso3,
        recipientNetwork: form.data.momo_payment,
      });
    } catch (error: any) {
      const message = formatTxError(error);
      setStatusTone('error');
      setStatusMessage(message);
      if (!(error instanceof UserFacingTxError)) {
        console.error('deposit error', error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const networkDetected = Boolean(recipientDetection?.suggestedMethodSlug);
  const selectedNetwork =
    (hasBoundMomo ? profileNetwork : null) ||
    networksForCountry.find(
      method => method.method_slug === form.data.momo_payment,
    );

  return (
    <Transition.Root show={modalOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed z-40 inset-0 overflow-y-auto"
        initialFocus={cancelButtonRef}
        onClose={() => {
          if (!isSubmitting) {
            setModalOpen(false);
          }
        }}
      >
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 z-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <span
            className="hidden sm:inline-block sm:align-middle sm:h-screen"
            aria-hidden="true"
          >
            &#8203;
          </span>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div
              className="relative z-10 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
              onMouseDown={event => event.stopPropagation()}
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <Dialog.Title
                      as="h3"
                      className="text-lg leading-6 font-medium text-gray-900"
                    >
                      Create USDT Listing (Sepolia)
                    </Dialog.Title>
                    <div className="mt-2">
                      <form>
                        <div
                          className={classNames(
                            'px-4 py-5 bg-white sm:p-6 shadow',
                            'sm:rounded-md',
                          )}
                        >
                          <div className="grid grid-cols-1 gap-6">
                            <div className="col-span-6 sm:col-span-4">
                              <div className="flex items-baseline justify-between gap-3">
                                <InputLabel
                                  htmlFor="amount"
                                  value="Amount (USDT)"
                                />
                                <p className="text-xs text-gray-500">
                                  {isLoadingBalance
                                    ? 'Loading balance…'
                                    : availableBalance !== null
                                      ? `Available: ${availableBalance} USDT`
                                      : 'Available: —'}
                                </p>
                              </div>
                              <TextInput
                                id="amount"
                                type="text"
                                className="mt-1 block w-full"
                                value={form.data.amount}
                                onChange={e =>
                                  form.setData('amount', e.currentTarget.value)
                                }
                                autoComplete="amount"
                                disabled={isSubmitting}
                              />
                              {balanceError ? (
                                <p className="mt-2 text-xs text-amber-700">
                                  {balanceError}
                                </p>
                              ) : null}
                              <InputError
                                message={form.errors.amount}
                                className="mt-2"
                              />
                            </div>

                            <div className="col-span-6 sm:col-span-4">
                              <InputLabel htmlFor="token" value="Token" />
                              <select
                                id="token"
                                value={form.data.token}
                                className="mt-1 block w-full"
                                onChange={e =>
                                  form.setData('token', e.currentTarget.value)
                                }
                                autoComplete="token"
                                disabled={isSubmitting}
                              >
                                <option value="">Select</option>
                                {tokens.map(token => (
                                  <option value={token.id} key={token.id}>
                                    {token.symbol}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <fieldset className="col-span-6 sm:col-span-4">
                              <legend className="text-sm font-medium text-gray-700">
                                Recipient mobile money account
                              </legend>

                              {hasBoundMomo ? (
                                <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-3 text-left">
                                  <p className="text-sm text-gray-900">
                                    {formatMsisdnDisplay(profileMobile)}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-500">
                                    From your profile · {profileCountry?.name} ·{' '}
                                    {profileNetwork?.method}
                                  </p>
                                  <p className="mt-2 text-xs text-gray-500">
                                    Update country or network under Profile if
                                    buyers should pay a different wallet.
                                  </p>
                                </div>
                              ) : (
                                <div className="mt-2 space-y-4 text-left">
                                  <p className="text-xs text-gray-500">
                                    No bound MoMo wallet on your profile. Enter
                                    the recipient number, then choose country
                                    and mobile network — or complete them under
                                    Profile for next time.
                                  </p>

                                  <div>
                                    <InputLabel
                                      htmlFor="recipient_mobile"
                                      value="Recipient mobile number"
                                    />
                                    <TextInput
                                      id="recipient_mobile"
                                      type="tel"
                                      className="mt-1 block w-full"
                                      value={form.data.recipient_mobile}
                                      onChange={e =>
                                        form.setData(
                                          'recipient_mobile',
                                          e.currentTarget.value,
                                        )
                                      }
                                      placeholder="+2609…"
                                      disabled={isSubmitting}
                                    />
                                  </div>

                                  <div>
                                    <InputLabel
                                      htmlFor="recipient_country_iso3"
                                      value="Country"
                                    />
                                    <select
                                      id="recipient_country_iso3"
                                      className="mt-1 block w-full"
                                      value={form.data.recipient_country_iso3}
                                      onChange={e =>
                                        form.setData(
                                          'recipient_country_iso3',
                                          e.currentTarget.value,
                                        )
                                      }
                                      disabled={isSubmitting}
                                    >
                                      <option value="">Select country</option>
                                      {countries.map(country => (
                                        <option
                                          key={country.iso3}
                                          value={country.iso3}
                                        >
                                          {country.name}
                                        </option>
                                      ))}
                                    </select>
                                    {recipientDetection?.countryIso3 ? (
                                      <p className="mt-1 text-xs text-gray-500">
                                        Suggested from the number — you can
                                        change it.
                                      </p>
                                    ) : null}
                                  </div>

                                  <div>
                                    <p className="text-sm font-medium text-gray-700">
                                      Mobile network
                                    </p>
                                    {!networkDetected &&
                                    form.data.recipient_mobile ? (
                                      <p className="mt-1 text-xs text-amber-700">
                                        Network could not be detected — select
                                        it below.
                                      </p>
                                    ) : null}
                                    <div className="mt-2 w-full max-w-xs text-sm font-medium text-gray-900 bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                                      {networksForCountry.length > 0 ? (
                                        networksForCountry.map(method => (
                                          <label
                                            key={method.id}
                                            htmlFor={`momo_payment_${method.method_slug}`}
                                            className="flex items-center gap-3 px-3 py-3 cursor-pointer"
                                          >
                                            <input
                                              id={`momo_payment_${method.method_slug}`}
                                              type="radio"
                                              name="recipient_momo_account"
                                              onChange={() =>
                                                form.setData(
                                                  'momo_payment',
                                                  method.method_slug,
                                                )
                                              }
                                              value={method.method_slug}
                                              checked={
                                                form.data.momo_payment ===
                                                method.method_slug
                                              }
                                              disabled={isSubmitting}
                                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-medium text-gray-900">
                                              {method.method}
                                              {recipientDetection?.suggestedMethodSlug ===
                                              method.method_slug
                                                ? ' (suggested)'
                                                : ''}
                                            </span>
                                          </label>
                                        ))
                                      ) : (
                                        <p className="px-3 py-3 text-sm text-gray-500">
                                          Select a country to load mobile
                                          networks.
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {selectedNetwork ? (
                                <p className="mt-3 text-xs text-gray-500">
                                  Buyers will pay {selectedNetwork.method}
                                  {hasBoundMomo
                                    ? ` at ${formatMsisdnDisplay(profileMobile)}`
                                    : form.data.recipient_mobile
                                      ? ` at ${formatMsisdnDisplay(form.data.recipient_mobile)}`
                                      : ''}
                                  .
                                </p>
                              ) : null}
                            </fieldset>

                            <div className="col-span-6 sm:col-span-4">
                              <InputLabel
                                htmlFor="price"
                                value="Unit Price in ZMW"
                              />
                              <TextInput
                                id="price"
                                type="number"
                                className="mt-1 block w-full"
                                value={form.data.price}
                                onChange={e =>
                                  form.setData('price', e.currentTarget.value)
                                }
                                autoComplete="price"
                                disabled={isSubmitting}
                              />
                              <InputError
                                message={form.errors.price}
                                className="mt-2"
                              />
                            </div>

                            {statusMessage && (
                              <p
                                role={
                                  statusTone === 'error' ? 'alert' : 'status'
                                }
                                className={classNames(
                                  'text-sm break-words rounded-md px-3 py-2',
                                  {
                                    'text-gray-700 bg-gray-50':
                                      statusTone === 'info',
                                    'text-green-800 bg-green-50':
                                      statusTone === 'success',
                                    'text-red-800 bg-red-50':
                                      statusTone === 'error',
                                  },
                                )}
                              >
                                {statusMessage}
                              </p>
                            )}

                            <div className="col-span-6 sm:col-span-4">
                              <SecondaryButton
                                className={classNames(
                                  { 'opacity-25': isSubmitting },
                                  'mt-2 mr-2',
                                )}
                                type="button"
                                onClick={() => submitTransactionDetails()}
                                disabled={isSubmitting}
                                aria-busy={isSubmitting}
                              >
                                {isSubmitting
                                  ? 'Waiting for confirmation…'
                                  : 'APPROVE & DEPOSIT USDT'}
                              </SecondaryButton>
                            </div>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-25"
                  onClick={() => setModalOpen(false)}
                  ref={cancelButtonRef}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
