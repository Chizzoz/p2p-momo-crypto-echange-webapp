import React, { Fragment, useRef, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import InputLabel from './InputLabel';
import TextInput from './TextInput';
import InputError from './InputError';
import SecondaryButton from './SecondaryButton';
import classNames from 'classnames';
import { useForm } from '@inertiajs/inertia-react';
import axios from 'axios';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';

type CreateTransactionModalProps = {
    modalOpen: boolean;
    setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function CreateTransactionModal({ modalOpen, setModalOpen }:CreateTransactionModalProps) {
    const route = useRoute();
    const page = useTypedPage();
    const form = useForm({
      mobile_number: "",
      given_name: "",
      family_name: "",
      id_number: "",
      gender: "",
    });

    const cancelButtonRef = useRef(null);
    const [responseData, setResponseData] = useState<{[k:string]: string} | undefined>({});

    async function submitTransactionDetails() {
      try {
          form.processing = true;
          const response = await axios.post(route('fetch_kyc_details'), {mobile_number: form.data.mobile_number});
          console.log('Full Response', response.data);
          let responseKeys = Object.fromEntries(Object.entries(form.data).filter(([_, v]) => v != ""));
          let responseDataFiltered: {[k:string]: string} | undefined = {};
          if (!response.data.hasOwnProperty('statusCode')) {
              responseDataFiltered['mobile_number'] = form.data.mobile_number;
          }
          Object.entries(responseKeys).forEach(async ([key, data], i) => {
              if (responseDataFiltered !== undefined && key !== "mobile_number") {
                  responseDataFiltered[key] = response.data[key];
              }
          });
          setResponseData(responseDataFiltered);
          form.processing = false;
      } catch (error) {
          console.error("error", error);
      }
    }

    return (
        <Transition.Root show={modalOpen} as={Fragment}>
            <Dialog
                as="div"
                auto-reopen="true"
                className="fixed z-40 inset-0 overflow-y-auto"
                initialFocus={cancelButtonRef}
                onClose={setModalOpen}
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
                        <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                    </Transition.Child>

                    {/* This element is to trick the browser into centering the modal contents. */}
                    <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
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
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                        <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
                                            Create Crypto Asset Listing
                                        </Dialog.Title>
                                        <div className="mt-2">
                                            <form>
                                            <div
                                                className={classNames(
                                                'px-4 py-5 bg-white sm:p-6 shadow',
                                                'sm:rounded-md',
                                                )}
                                            >
                                                <div className="grid grid-cols-6 gap-6">
                                                    {/* <!-- Mobile Number --> */}
                                                    <div className="col-span-6 sm:col-span-4">
                                                    <InputLabel htmlFor="mobile_number" value="Mobile Number" />
                                                    <TextInput
                                                        id="mobile_number"
                                                        type="text"
                                                        className="mt-1 block w-full"
                                                        value={form.data.mobile_number}
                                                        onChange={e => form.setData('mobile_number', e.currentTarget.value)}
                                                        autoComplete="mobile_number"
                                                    />
                                                    <InputError message={form.errors.mobile_number} className="mt-2" />
                                                    </div>

                                                    {/* <!-- Firstname --> */}
                                                    <div className="col-span-6 sm:col-span-4">
                                                    <InputLabel htmlFor="given_name" value="Firstname" />
                                                    <TextInput
                                                        id="given_name"
                                                        type="text"
                                                        className="mt-1 block w-full"
                                                        value={form.data.given_name}
                                                        onChange={e => form.setData('given_name', e.currentTarget.value)}
                                                        autoComplete="given_name"
                                                    />
                                                    <InputError message={form.errors.given_name} className="mt-2" />
                                                    </div>

                                                    {/* <!-- Lastname --> */}
                                                    <div className="col-span-6 sm:col-span-4">
                                                    <InputLabel htmlFor="family_name" value="Lastname" />
                                                    <TextInput
                                                        id="family_name"
                                                        type="text"
                                                        className="mt-1 block w-full"
                                                        value={form.data.family_name}
                                                        onChange={e => form.setData('family_name', e.currentTarget.value)}
                                                        autoComplete="lastname"
                                                    />
                                                    <InputError message={form.errors.family_name} className="mt-2" />
                                                    </div>

                                                    {/* <!-- ID Number --> */}
                                                    <div className="col-span-6 sm:col-span-4">
                                                    <InputLabel htmlFor="id_number" value="ID Number" />
                                                    <TextInput
                                                        id="id_number"
                                                        type="text"
                                                        className="mt-1 block w-full"
                                                        value={form.data.id_number}
                                                        onChange={e => form.setData('id_number', e.currentTarget.value)}
                                                        autoComplete="id_number"
                                                    />
                                                    <InputError message={form.errors.id_number} className="mt-2" />
                                                    </div>

                                                    {/* <!-- Gender --> */}
                                                    <div className="col-span-6 sm:col-span-4">
                                                    <InputLabel htmlFor="gender" value="Gender" />
                                                    {/* <TextInput
                                                        id="gender"
                                                        type="text"
                                                        className="mt-1 block w-full"
                                                        value={form.data.gender}
                                                        onChange={e => form.setData('gender', e.currentTarget.value)}
                                                        autoComplete="gender"
                                                    /> */}


                                                    <select
                                                        id="gender"
                                                        value={form.data.gender}
                                                        className="mt-1 block w-full"
                                                        onChange={e => form.setData('gender', e.currentTarget.value)}
                                                        autoComplete="gender"
                                                    >
                                                        <option value="">Select</option>
                                                        <option value="FEMALE">FEMALE</option>
                                                        <option value="MALE">MALE</option>
                                                    </select>

                                                    <InputError message={form.errors.gender} className="mt-2" />
                                                    </div>
                                                    <div className="col-span-6 sm:col-span-4">

                                                        <SecondaryButton
                                                        className={classNames({ 'opacity-25': form.processing }, "mt-2 mr-2")}
                                                        type="button"
                                                        onClick={() => submitTransactionDetails()}
                                                        disabled={form.processing}
                                                        >
                                                            SUBMIT
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
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => setModalOpen(false)}
                                    ref={cancelButtonRef}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>
    )
}
