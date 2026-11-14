import React, { Fragment, FormEvent, useMemo, useRef, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import classNames from 'classnames';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';
import {
  ensureSepoliaChain,
  formatTxError,
  getBrowserProvider,
} from '@/lib/contracts';
import { CountryOption } from '@/types';

type Props = {
  modalOpen: boolean;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function CreateMoMoOfferModal({
  modalOpen,
  setModalOpen,
}: Props) {
  const page = useTypedPage();
  const route = useRoute();
  const user = page.props.user;
  const countries = (page.props.countries as CountryOption[]) || [];
  const cancelButtonRef = useRef(null);

  const currency = useMemo(() => {
    const country = countries.find(c => c.id === user?.country_id);
    const code = String(country?.currency_code || '').toUpperCase();
    return code.length === 3 ? code : 'ZMW';
  }, [countries, user?.country_id]);

  const [fiatAmount, setFiatAmount] = useState('');
  const [usdtAmount, setUsdtAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState<'info' | 'success' | 'error'>(
    'info',
  );

  const unitPrice = useMemo(() => {
    const f = Number(fiatAmount);
    const u = Number(usdtAmount);
    if (!Number.isFinite(f) || !Number.isFinite(u) || u <= 0) return '';
    return (f / u).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  }, [fiatAmount, usdtAmount]);

  function resetForm() {
    setFiatAmount('');
    setUsdtAmount('');
    setStatusMessage('');
    setStatusTone('info');
  }

  async function submitOffer(e: FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!user) {
      setStatusTone('error');
      setStatusMessage('Log in and connect MetaMask to list MoMo.');
      return;
    }
    if (!user.mobile_number || !user.payment_method_id) {
      setStatusTone('error');
      setStatusMessage('Bind mobile money in Profile before listing MoMo.');
      return;
    }

    setIsSubmitting(true);
    setStatusTone('info');
    setStatusMessage('Connecting wallet…');
    try {
      await ensureSepoliaChain();
      const provider = getBrowserProvider();
      const [buyer] = await provider.send('eth_requestAccounts', []);
      setStatusMessage(
        'Starting MoMo deposit — approve the prompt on your phone…',
      );
      const { data } = await axios.post(
        route('buy_orders.store'),
        {
          buyer_address: buyer,
          fiat_amount: fiatAmount,
          usdt_amount: usdtAmount,
        },
        { timeout: 60000 },
      );
      setStatusTone('success');
      setStatusMessage(data.message || 'Offer submitted.');
      resetForm();
      window.setTimeout(() => {
        setModalOpen(false);
        router.visit(route('buy_orders.index'));
      }, 900);
    } catch (error: any) {
      setStatusTone('error');
      const timedOut =
        error?.code === 'ECONNABORTED' ||
        String(error?.message || '').toLowerCase().includes('timeout');
      setStatusMessage(
        timedOut
          ? 'Request timed out waiting for MoMo. Check MoMo offers — the deposit may still have been created.'
          : error?.response?.data?.message ||
              formatTxError(error) ||
              error?.message ||
              'Could not create MoMo offer.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Transition.Root show={modalOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed z-40 inset-0 overflow-y-auto"
        initialFocus={cancelButtonRef}
        onClose={() => {
          if (!isSubmitting) {
            setModalOpen(false);
            resetForm();
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
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <Dialog.Title
                    as="h3"
                    className="text-lg leading-6 font-medium text-gray-900"
                  >
                    List MoMo (get USDT)
                  </Dialog.Title>
                  <p className="mt-1 text-sm text-gray-500">
                    Deposit mobile money at your rate. Currency:{' '}
                    <span className="font-semibold text-gray-700">
                      {currency}
                    </span>
                    .
                  </p>

                  <form className="mt-5 space-y-4" onSubmit={submitOffer}>
                    <div>
                      <InputLabel
                        htmlFor="momo_fiat_amount"
                        value={`Fiat amount (${currency})`}
                      />
                      <TextInput
                        id="momo_fiat_amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        className="mt-1 block w-full"
                        value={fiatAmount}
                        onChange={e => setFiatAmount(e.currentTarget.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <InputLabel
                        htmlFor="momo_usdt_amount"
                        value="USDT you want"
                      />
                      <TextInput
                        id="momo_usdt_amount"
                        type="number"
                        min="0.000001"
                        step="any"
                        required
                        className="mt-1 block w-full"
                        value={usdtAmount}
                        onChange={e => setUsdtAmount(e.currentTarget.value)}
                        disabled={isSubmitting}
                      />
                      {unitPrice ? (
                        <p className="mt-1 text-xs text-gray-500">
                          Implied rate: {unitPrice} {currency} / USDT
                        </p>
                      ) : null}
                      <InputError className="mt-2" />
                    </div>

                    {statusMessage ? (
                      <p
                        role={statusTone === 'error' ? 'alert' : 'status'}
                        className={classNames(
                          'text-sm break-words rounded-md px-3 py-2',
                          {
                            'text-gray-700 bg-gray-50': statusTone === 'info',
                            'text-green-800 bg-green-50':
                              statusTone === 'success',
                            'text-red-800 bg-red-50': statusTone === 'error',
                          },
                        )}
                      >
                        {statusMessage}
                      </p>
                    ) : null}

                    <SecondaryButton
                      type="submit"
                      className={classNames('mt-2', {
                        'opacity-25': isSubmitting,
                      })}
                      disabled={isSubmitting}
                      aria-busy={isSubmitting}
                    >
                      {isSubmitting ? 'Working…' : 'LIST MOMO'}
                    </SecondaryButton>
                  </form>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  ref={cancelButtonRef}
                  disabled={isSubmitting}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-60"
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
