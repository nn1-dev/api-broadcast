import { assertEquals } from "jsr:@std/assert";
import { chunkArray } from "./utils.ts";

Deno.test("Chunks array with length divisable by size", () => {
  const actual = chunkArray([1, 2, 3, 4, 5, 6], 3);
  const expected = [[1, 2, 3], [4, 5, 6]];

  assertEquals(actual, expected);
});

Deno.test("Chunks array with length not divisable by size", () => {
  const actual = chunkArray([1, 2, 3, 4], 3);
  const expected = [[1, 2, 3], [4]];

  assertEquals(actual, expected);
});

Deno.test("Chunks array with length smaller then single chunk", () => {
  const actual = chunkArray([1, 2], 3);
  const expected = [[1, 2]];

  assertEquals(actual, expected);
});
