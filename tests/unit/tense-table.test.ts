// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  buildTenseTable,
  tenseKindLabel,
  tenseKinds,
  tenseTimeLabel,
  tenseTimes,
  type TenseFormInput,
} from "@/features/vocab/tense-table";

const f = (
  time: TenseFormInput["time"],
  kind: TenseFormInput["kind"],
  form: string,
): TenseFormInput => ({ time, kind, form, exampleEn: `He ${form} it.` });

const allForms: TenseFormInput[] = [
  f("PRESENT", "SIMPLE", "flies"),
  f("PRESENT", "CONTINUOUS", "is flying"),
  f("PRESENT", "PERFECT", "has flown"),
  f("PAST", "SIMPLE", "flew"),
  f("PAST", "CONTINUOUS", "was flying"),
  f("PAST", "PERFECT", "had flown"),
  f("FUTURE", "SIMPLE", "will fly"),
  f("FUTURE", "CONTINUOUS", "will be flying"),
  f("FUTURE", "PERFECT", "will have flown"),
];

const formsOf = (rows: ReturnType<typeof buildTenseTable>) =>
  rows.map((row) => row.cells.map((cell) => cell?.form ?? null));

describe("buildTenseTable", () => {
  test("rows are present, past, future; columns simple, continuous, perfect", () => {
    expect(tenseTimes).toEqual(["PRESENT", "PAST", "FUTURE"]);
    expect(tenseKinds).toEqual(["SIMPLE", "CONTINUOUS", "PERFECT"]);
    expect(buildTenseTable([]).map((row) => row.time)).toEqual(["PRESENT", "PAST", "FUTURE"]);
  });

  test("places all nine forms in the right cells", () => {
    expect(formsOf(buildTenseTable(allForms))).toEqual([
      ["flies", "is flying", "has flown"],
      ["flew", "was flying", "had flown"],
      ["will fly", "will be flying", "will have flown"],
    ]);
  });

  test("keeps the example with its form", () => {
    const [present] = buildTenseTable(allForms);
    expect(present.cells[1]).toEqual({ form: "is flying", exampleEn: "He is flying it." });
  });

  test("input order does not matter", () => {
    const reversed = [...allForms].reverse();
    expect(buildTenseTable(reversed)).toEqual(buildTenseTable(allForms));
  });

  test("missing forms become null", () => {
    const rows = buildTenseTable([f("PAST", "SIMPLE", "flew")]);
    expect(formsOf(rows)).toEqual([
      [null, null, null],
      ["flew", null, null],
      [null, null, null],
    ]);
  });

  test("an empty list gives a 3 x 3 table of nulls", () => {
    const rows = buildTenseTable([]);
    expect(rows).toHaveLength(3);
    for (const row of rows) expect(row.cells).toEqual([null, null, null]);
  });

  test("the first form wins when a cell is duplicated", () => {
    const rows = buildTenseTable([f("FUTURE", "SIMPLE", "will fly"), f("FUTURE", "SIMPLE", "shall fly")]);
    expect(rows[2].cells[0]?.form).toBe("will fly");
  });

  test("every row and column has a Bengali label", () => {
    for (const time of tenseTimes) expect(tenseTimeLabel[time].bn).not.toBe("");
    for (const kind of tenseKinds) expect(tenseKindLabel[kind].bn).not.toBe("");
  });
});
