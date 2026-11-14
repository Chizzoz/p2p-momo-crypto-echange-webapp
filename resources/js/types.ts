type DateTime = string;

export type Nullable<T> = T | null;

export interface Team {
  id: number;
  name: string;
  personal_team: boolean;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface User {
  id: number;
  name: string;
  email: Nullable<string>;
  eth_address: Nullable<string>;
  mobile_number: Nullable<string>;
  country_id: Nullable<number>;
  payment_method_id: Nullable<number>;
  current_team_id: Nullable<number>;
  profile_photo_path: Nullable<string>;
  profile_photo_url: string;
  has_password: boolean;
  two_factor_enabled: boolean;
  email_verified_at: Nullable<DateTime>;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface CountryOption {
  id: number;
  name: string;
  iso2: string;
  iso3: string;
  currency_id?: number | null;
  currency_code?: string;
  currency_symbol?: string | null;
  currency_name?: string | null;
}

export interface PaymentMethodOption {
  id: number;
  method: string;
  method_slug: string;
  country_id: Nullable<number>;
  pawapay_provider: Nullable<string>;
}

export type InertiaSharedProps<T = {}> = T & {
  jetstream: {
    canCreateTeams: boolean;
    canManageTwoFactorAuthentication: boolean;
    canUpdatePassword: boolean;
    canUpdateProfileInformation: boolean;
    flash: any;
    hasAccountDeletionFeatures: boolean;
    hasApiFeatures: boolean;
    hasTeamFeatures: boolean;
    hasTermsAndPrivacyPolicyFeature: boolean;
    managesProfilePhotos: boolean;
  };
  user: User & {
    all_teams?: Team[];
    current_team?: Team;
  };
  tokens?: Array<{
    id: number;
    token: string;
    symbol: string;
    token_slug: string;
  }>;
  countries?: CountryOption[];
  payment_methods?: PaymentMethodOption[];
  errorBags: any;
  errors: any;
};

export interface Session {
  id: number;
  ip_address: string;
  is_current_device: boolean;
  agent: {
    is_desktop: boolean;
    platform: string;
    browser: string;
  };
  last_active: DateTime;
}

export interface ApiToken {
  id: number;
  name: string;
  abilities: string[];
  last_used_ago: Nullable<DateTime>;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface JetstreamTeamPermissions {
  canAddTeamMembers: boolean;
  canDeleteTeam: boolean;
  canRemoveTeamMembers: boolean;
  canUpdateTeam: boolean;
}

export interface Role {
  key: string;
  name: string;
  permissions: string[];
  description: string;
}

export interface TeamInvitation {
  id: number;
  team_id: number;
  email: string;
  role: Nullable<string>;
  created_at: DateTime;
  updated_at: DateTime;
}

interface Window {
    ethereum: any
}
