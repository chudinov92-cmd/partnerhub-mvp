import type { Metadata } from "next";

export const privatePageRobots: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
};
