import { router } from '@inertiajs/react';
import { useForm } from '@inertiajs/react';
import classNames from 'classnames';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';
import ActionMessage from '@/Components/ActionMessage';
import FormSection from '@/Components/FormSection';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import SecondaryButton from '@/Components/SecondaryButton';
import { detectMsisdn } from '@/lib/msisdn';
import { CountryOption, PaymentMethodOption, User } from '@/types';

interface Props {
  user: User;
}

export default function UpdateProfileInformationForm({ user }: Props) {
  const page = useTypedPage();
  const countries: CountryOption[] =
    (page.props.countries as CountryOption[]) || [];
  const paymentMethods: PaymentMethodOption[] =
    (page.props.payment_methods as PaymentMethodOption[]) || [];

  const form = useForm({
    _method: 'PUT',
    name: user.name,
    email: user.email || '',
    mobile_number: user.mobile_number || '',
    country_id: user.country_id ? String(user.country_id) : '',
    payment_method_id: user.payment_method_id
      ? String(user.payment_method_id)
      : '',
    photo: null as File | null,
  });
  const route = useRoute();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const lastSuggestedCountry = useRef<string | null>(null);
  const lastSuggestedMethod = useRef<string | null>(null);

  const selectedCountry = useMemo(
    () =>
      countries.find(
        country => String(country.id) === String(form.data.country_id),
      ) || null,
    [countries, form.data.country_id],
  );

  const networksForCountry = useMemo(() => {
    if (!selectedCountry) {
      return [] as PaymentMethodOption[];
    }
    return paymentMethods.filter(
      method => method.country_id === selectedCountry.id,
    );
  }, [paymentMethods, selectedCountry]);

  // Suggest country / MNO from the number when possible (user can override).
  useEffect(() => {
    const detection = form.data.mobile_number
      ? detectMsisdn(
          form.data.mobile_number,
          selectedCountry?.iso3 || 'ZMB',
        )
      : null;

    if (!detection) {
      return;
    }

    if (detection.countryIso3) {
      const country = countries.find(
        row => row.iso3 === detection.countryIso3,
      );
      if (
        country &&
        String(form.data.country_id) !== String(country.id) &&
        lastSuggestedCountry.current !== detection.countryIso3
      ) {
        lastSuggestedCountry.current = detection.countryIso3;
        form.setData('country_id', String(country.id));
      }
    }

    if (detection.suggestedMethodSlug && selectedCountry) {
      const method = paymentMethods.find(
        row =>
          row.method_slug === detection.suggestedMethodSlug &&
          row.country_id === selectedCountry.id,
      );
      if (
        method &&
        String(form.data.payment_method_id) !== String(method.id) &&
        lastSuggestedMethod.current !== detection.suggestedMethodSlug
      ) {
        lastSuggestedMethod.current = detection.suggestedMethodSlug;
        form.setData('payment_method_id', String(method.id));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.data.mobile_number, countries, paymentMethods, selectedCountry?.id]);

  // Drop MNO if it no longer belongs to the selected country.
  useEffect(() => {
    if (!form.data.payment_method_id) {
      return;
    }
    const stillValid = networksForCountry.some(
      method => String(method.id) === String(form.data.payment_method_id),
    );
    if (!stillValid) {
      form.setData('payment_method_id', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.data.country_id, networksForCountry]);

  function updateProfileInformation() {
    form.post(route('user-profile-information.update'), {
      errorBag: 'updateProfileInformation',
      preserveScroll: true,
      onSuccess: () => clearPhotoFileInput(),
    });
  }

  function selectNewPhoto() {
    photoRef.current?.click();
  }

  function updatePhotoPreview() {
    const photo = photoRef.current?.files?.[0];

    if (!photo) {
      return;
    }

    form.setData('photo', photo);

    const reader = new FileReader();

    reader.onload = e => {
      setPhotoPreview(e.target?.result as string);
    };

    reader.readAsDataURL(photo);
  }

  function deletePhoto() {
    router.delete(route('current-user-photo.destroy'), {
      preserveScroll: true,
      onSuccess: () => {
        setPhotoPreview(null);
        clearPhotoFileInput();
      },
    });
  }

  function clearPhotoFileInput() {
    if (photoRef.current?.value) {
      photoRef.current.value = '';
      form.setData('photo', null);
    }
  }

  return (
    <FormSection
      onSubmit={updateProfileInformation}
      title={'Profile Information'}
      description={`Update your account's profile information, email, and mobile money wallet.`}
      renderActions={() => (
        <>
          <ActionMessage on={form.recentlySuccessful} className="mr-3">
            Saved.
          </ActionMessage>

          <PrimaryButton
            className={classNames({ 'opacity-25': form.processing })}
            disabled={form.processing}
          >
            Save
          </PrimaryButton>
        </>
      )}
    >
      {/* <!-- Profile Photo --> */}
      {page.props.jetstream.managesProfilePhotos ? (
        <div className="col-span-6 sm:col-span-4">
          <input
            type="file"
            className="hidden"
            ref={photoRef}
            onChange={updatePhotoPreview}
          />

          <InputLabel htmlFor="photo" value="Photo" />

          {photoPreview ? (
            <div className="mt-2">
              <span
                className="block rounded-full w-20 h-20"
                style={{
                  backgroundSize: 'cover',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center center',
                  backgroundImage: `url('${photoPreview}')`,
                }}
              ></span>
            </div>
          ) : (
            <div className="mt-2">
              <img
                src={user.profile_photo_url}
                alt={user.name}
                className="rounded-full h-20 w-20 object-cover"
              />
            </div>
          )}

          <SecondaryButton
            className="mt-2 mr-2"
            type="button"
            onClick={selectNewPhoto}
          >
            Select A New Photo
          </SecondaryButton>

          {user.profile_photo_path ? (
            <SecondaryButton
              type="button"
              className="mt-2"
              onClick={deletePhoto}
            >
              Remove Photo
            </SecondaryButton>
          ) : null}

          <InputError message={form.errors.photo} className="mt-2" />
        </div>
      ) : null}

      {/* <!-- Name --> */}
      <div className="col-span-6 sm:col-span-4">
        <InputLabel htmlFor="name" value="Name" />
        <TextInput
          id="name"
          type="text"
          className="mt-1 block w-full"
          value={form.data.name}
          onChange={e => form.setData('name', e.currentTarget.value)}
          autoComplete="name"
        />
        <InputError message={form.errors.name} className="mt-2" />
      </div>

      {/* <!-- Email --> */}
      <div className="col-span-6 sm:col-span-4">
        <InputLabel htmlFor="email" value="Email" />
        <TextInput
          id="email"
          type="email"
          className="mt-1 block w-full"
          value={form.data.email}
          onChange={e => form.setData('email', e.currentTarget.value)}
        />
        <InputError message={form.errors.email} className="mt-2" />
      </div>

      {/* <!-- Mobile money number --> */}
      <div className="col-span-6 sm:col-span-4">
        <InputLabel htmlFor="mobile_number" value="Mobile money number" />
        <TextInput
          id="mobile_number"
          type="tel"
          className="mt-1 block w-full"
          value={form.data.mobile_number}
          onChange={e =>
            form.setData('mobile_number', e.currentTarget.value)
          }
          placeholder="+2609…"
          autoComplete="tel"
        />
        <p className="mt-1 text-xs text-gray-500">
          Used as your default recipient MoMo account on listings. Country and
          network below can be suggested from the number when known.
        </p>
        <InputError message={form.errors.mobile_number} className="mt-2" />
      </div>

      {/* <!-- Country --> */}
      <div className="col-span-6 sm:col-span-4">
        <InputLabel htmlFor="country_id" value="Country" />
        <select
          id="country_id"
          className="mt-1 block w-full"
          value={form.data.country_id}
          onChange={e => form.setData('country_id', e.currentTarget.value)}
          disabled={!form.data.mobile_number}
        >
          <option value="">Select country</option>
          {countries.map(country => (
            <option key={country.id} value={country.id}>
              {country.name}
            </option>
          ))}
        </select>
        <InputError message={form.errors.country_id} className="mt-2" />
      </div>

      {/* <!-- Mobile network (MNO) --> */}
      <div className="col-span-6 sm:col-span-4">
        <InputLabel htmlFor="payment_method_id" value="Mobile network" />
        <select
          id="payment_method_id"
          className="mt-1 block w-full"
          value={form.data.payment_method_id}
          onChange={e =>
            form.setData('payment_method_id', e.currentTarget.value)
          }
          disabled={!form.data.country_id}
        >
          <option value="">
            {form.data.country_id
              ? 'Select network'
              : 'Select a country first'}
          </option>
          {networksForCountry.map(method => (
            <option key={method.id} value={method.id}>
              {method.method}
            </option>
          ))}
        </select>
        <InputError
          message={form.errors.payment_method_id}
          className="mt-2"
        />
      </div>
    </FormSection>
  );
}
