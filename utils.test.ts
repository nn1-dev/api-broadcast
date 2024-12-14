import { assertEquals } from "jsr:@std/assert";
import { chunkArray } from "./utils.ts";

Deno.test("splits array into equal chunks", () => {
  const actual = chunkArray([1, 2, 3, 4, 5, 6], 3);
  const expected = [[1, 2, 3], [4, 5, 6]];

  assertEquals(actual, expected);
});

Deno.test("splits array into uneven chunks", () => {
  const actual = chunkArray([1, 2, 3, 4], 3);
  const expected = [[1, 2, 3], [4]];

  assertEquals(actual, expected);
});

Deno.test("returns a single chunk in case the size is greater than array count", () => {
  const actual = chunkArray([1, 2], 3);
  const expected = [[1, 2]];

  assertEquals(actual, expected);
});

Deno.test("returns an empty array if the input is empty", () => {
  const actual = chunkArray([], 3);
  const expected = [] as never[];

  assertEquals(actual, expected);
});
