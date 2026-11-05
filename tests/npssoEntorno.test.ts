import { describe, expect, it } from "vitest";
import { npssoDelEntorno } from "@/lib/psn/auth";

const NPSSO = "AbCdEf0123456789AbCdEf0123456789AbCdEf0123456789AbCdEf0123456789";

describe("npssoDelEntorno", () => {
  it("acepta el valor solo, con espacios o con comillas", () => {
    expect(npssoDelEntorno(NPSSO)).toBe(NPSSO);
    expect(npssoDelEntorno(`  ${NPSSO}\n`)).toBe(NPSSO);
    expect(npssoDelEntorno(`"${NPSSO}"`)).toBe(NPSSO);
  });

  it("saca el valor si se pegó la respuesta entera de Sony", () => {
    expect(npssoDelEntorno(`{"npsso":"${NPSSO}"}`)).toBe(NPSSO);
    expect(npssoDelEntorno(`"npsso":"${NPSSO}"`)).toBe(NPSSO);
    expect(npssoDelEntorno(`npsso=${NPSSO}`)).toBe(NPSSO);
  });

  it("vacío es que no hay", () => {
    expect(npssoDelEntorno(undefined)).toBeNull();
    expect(npssoDelEntorno("   ")).toBeNull();
    expect(npssoDelEntorno('""')).toBeNull();
  });
});

describe("npssosDelEntorno (respaldo)", () => {
  const OTRO = "ZzZz0123456789ZzZz0123456789ZzZz0123456789ZzZz0123456789ZzZz0123";
  it("el principal primero y luego los de respaldo, limpios y sin repetir", async () => {
    const { npssosDelEntorno } = await import("@/lib/psn/auth");
    expect(npssosDelEntorno(NPSSO, ` "${OTRO}" ,\n${NPSSO}`)).toEqual([NPSSO, OTRO]);
    expect(npssosDelEntorno(undefined, OTRO)).toEqual([OTRO]);
    expect(npssosDelEntorno(undefined, undefined)).toEqual([]);
  });
});
