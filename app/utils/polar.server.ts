import { Polar } from '@polar-sh/sdk';

if (!process.env.POLAR_ACCESS_TOKEN) {
  console.warn(
    'POLAR_ACCESS_TOKEN is not set. Polar integration will not work.'
  );
}

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
});
