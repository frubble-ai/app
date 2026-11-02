import { faker } from "@faker-js/faker";
import { Kind } from "graphql";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { dateTimeScalar, userIdScalar } from "../scalars";

describe("UserId", () => {
	it("accepts a Better Auth id in every direction", () => {
		const id = faker.string.alphanumeric(32);

		expect(userIdScalar.serialize(id)).toBe(id);
		expect(userIdScalar.parseValue(id)).toBe(id);
		expect(userIdScalar.parseLiteral({ kind: Kind.STRING, value: id })).toBe(
			id,
		);
	});

	it.each([
		{ label: "too short", value: faker.string.alphanumeric(8) },
		{ label: "a UUID with dots", value: "a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p" },
		{ label: "a number", value: 1234567890 },
	])("rejects $label", ({ value }) => {
		expect(() => userIdScalar.parseValue(value)).toThrow();
		expect(() => userIdScalar.serialize(value)).toThrow();
	});

	it("rejects a non-string literal", () => {
		expect(() =>
			userIdScalar.parseLiteral({ kind: Kind.INT, value: "1" }),
		).toThrow(/string/);
	});
});

describe("DateTime", () => {
	it("serializes a Luxon DateTime, a Date and an ISO string as UTC ISO strings", () => {
		const date = faker.date.recent();
		const iso = DateTime.fromJSDate(date, { zone: "utc" }).toISO();

		expect(dateTimeScalar.serialize(DateTime.fromJSDate(date))).toBe(iso);
		expect(dateTimeScalar.serialize(date)).toBe(iso);
		expect(dateTimeScalar.serialize(iso)).toBe(iso);
	});

	it("parses an ISO input into a Luxon DateTime at UTC", () => {
		const iso = "2026-10-31T12:34:56.000Z";

		const parsed = dateTimeScalar.parseValue(iso);
		const literal = dateTimeScalar.parseLiteral({
			kind: Kind.STRING,
			value: iso,
		});

		expect(DateTime.isDateTime(parsed)).toBe(true);
		expect(parsed.toISO()).toBe(iso);
		expect(literal.toISO()).toBe(iso);
	});

	it.each([
		{ label: "not a date", value: "yesterday" },
		{ label: "a number", value: 1700000000 },
		{ label: "nothing", value: null },
	])("rejects $label", ({ value }) => {
		expect(() => dateTimeScalar.serialize(value)).toThrow();
		expect(() => dateTimeScalar.parseValue(value)).toThrow();
	});

	it("rejects a non-string literal", () => {
		expect(() =>
			dateTimeScalar.parseLiteral({ kind: Kind.INT, value: "1" }),
		).toThrow(/string/);
	});
});
