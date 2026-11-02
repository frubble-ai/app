import type { TEmailMessage } from "@frubble/events";
import type { ReactElement } from "react";
import { render } from "react-email";
import { PasswordResetEmail } from "./templates/password-reset";
import { SignupCodeEmail } from "./templates/signup-code";

// Every email type comes from the catalog's `TEmailMessage`: a new message there is a compile
// error here until it has a subject and a template.
export type TEmailType = TEmailMessage["type"];

/** Links the worker sets per deployment; a template never hardcodes them. */
export type TEmailLinks = {
	supportUrl?: string;
};

type TEmailPropsMap = {
	"signup.code_requested": {
		code: string;
		isAdminInvite: boolean;
	} & TEmailLinks;
	"password.reset_requested": { code: string } & TEmailLinks;
};

/** One email to send: its type and exactly that template's props. */
export type TEmail = {
	[TType in TEmailType]: { type: TType; props: TEmailPropsMap[TType] };
}[TEmailType];

type TEmailTemplate<TType extends TEmailType> = {
	subject: string;
	build: (props: TEmailPropsMap[TType]) => ReactElement;
};

const EMAILS: { [TType in TEmailType]: TEmailTemplate<TType> } = {
	"signup.code_requested": {
		subject: "Your Frubble code",
		build: (props) => SignupCodeEmail(props),
	},
	"password.reset_requested": {
		subject: "Reset your password",
		build: (props) => PasswordResetEmail(props),
	},
};

export function getSubject(type: TEmailType): string {
	return EMAILS[type].subject;
}

export async function renderEmail<TType extends TEmailType>(
	type: TType,
	props: TEmailPropsMap[TType],
): Promise<string> {
	const template = EMAILS[type] as TEmailTemplate<TType>;
	return render(template.build(props));
}
