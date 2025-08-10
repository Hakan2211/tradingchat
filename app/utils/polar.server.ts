import { Polar } from '@polar-sh/sdk';

if (!process.env.POLAR_ACCESS_TOKEN) {
  console.warn(
    'POLAR_ACCESS_TOKEN is not set. Polar integration will not work.'
  );
}

// Only initialize Polar if access token is available
export const polar = process.env.POLAR_ACCESS_TOKEN
  ? new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN,
    })
  : null;
