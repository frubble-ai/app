import type * as Types from '@frubble/gql/types';
import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { TGraphqlContext } from '../services/api/graphql/index';
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };


export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Types.Maybe<TTypes> | Promise<Types.Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  AuthPayload: ResolverTypeWrapper<Types.AuthPayload>;
  Boolean: ResolverTypeWrapper<Types.Scalars['Boolean']['output']>;
  ChangePasswordInput: Types.ChangePasswordInput;
  ChangePasswordPayload: ResolverTypeWrapper<Types.ChangePasswordPayload>;
  DateTime: ResolverTypeWrapper<Types.Scalars['DateTime']['output']>;
  Me: ResolverTypeWrapper<Types.Me>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  RequestCodePayload: ResolverTypeWrapper<Types.RequestCodePayload>;
  RequestPasswordResetInput: Types.RequestPasswordResetInput;
  RequestSignUpCodeInput: Types.RequestSignUpCodeInput;
  ResetPasswordInput: Types.ResetPasswordInput;
  ResetPasswordPayload: ResolverTypeWrapper<Types.ResetPasswordPayload>;
  SignInInput: Types.SignInInput;
  SignOutPayload: ResolverTypeWrapper<Types.SignOutPayload>;
  SignUpInput: Types.SignUpInput;
  String: ResolverTypeWrapper<Types.Scalars['String']['output']>;
  UserId: ResolverTypeWrapper<Types.Scalars['UserId']['output']>;
  UserRole: Types.UserRole;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AuthPayload: Types.AuthPayload;
  Boolean: Types.Scalars['Boolean']['output'];
  ChangePasswordInput: Types.ChangePasswordInput;
  ChangePasswordPayload: Types.ChangePasswordPayload;
  DateTime: Types.Scalars['DateTime']['output'];
  Me: Types.Me;
  Mutation: Record<PropertyKey, never>;
  Query: Record<PropertyKey, never>;
  RequestCodePayload: Types.RequestCodePayload;
  RequestPasswordResetInput: Types.RequestPasswordResetInput;
  RequestSignUpCodeInput: Types.RequestSignUpCodeInput;
  ResetPasswordInput: Types.ResetPasswordInput;
  ResetPasswordPayload: Types.ResetPasswordPayload;
  SignInInput: Types.SignInInput;
  SignOutPayload: Types.SignOutPayload;
  SignUpInput: Types.SignUpInput;
  String: Types.Scalars['String']['output'];
  UserId: Types.Scalars['UserId']['output'];
};

export type AuthPayloadResolvers<ContextType = TGraphqlContext, ParentType extends ResolversParentTypes['AuthPayload'] = ResolversParentTypes['AuthPayload']> = {
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['Me'], ParentType, ContextType>;
};

export type ChangePasswordPayloadResolvers<ContextType = TGraphqlContext, ParentType extends ResolversParentTypes['ChangePasswordPayload'] = ResolversParentTypes['ChangePasswordPayload']> = {
  changed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type MeResolvers<ContextType = TGraphqlContext, ParentType extends ResolversParentTypes['Me'] = ResolversParentTypes['Me']> = {
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UserId'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['UserRole'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = TGraphqlContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  _empty?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  changePassword?: Resolver<ResolversTypes['ChangePasswordPayload'], ParentType, ContextType, RequireFields<Types.MutationChangePasswordArgs, 'input'>>;
  requestPasswordReset?: Resolver<ResolversTypes['RequestCodePayload'], ParentType, ContextType, RequireFields<Types.MutationRequestPasswordResetArgs, 'input'>>;
  requestSignUpCode?: Resolver<ResolversTypes['RequestCodePayload'], ParentType, ContextType, RequireFields<Types.MutationRequestSignUpCodeArgs, 'input'>>;
  resetPassword?: Resolver<ResolversTypes['ResetPasswordPayload'], ParentType, ContextType, RequireFields<Types.MutationResetPasswordArgs, 'input'>>;
  signIn?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<Types.MutationSignInArgs, 'input'>>;
  signOut?: Resolver<ResolversTypes['SignOutPayload'], ParentType, ContextType>;
  signUp?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<Types.MutationSignUpArgs, 'input'>>;
};

export type QueryResolvers<ContextType = TGraphqlContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  health?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  me?: Resolver<Types.Maybe<ResolversTypes['Me']>, ParentType, ContextType>;
};

export type RequestCodePayloadResolvers<ContextType = TGraphqlContext, ParentType extends ResolversParentTypes['RequestCodePayload'] = ResolversParentTypes['RequestCodePayload']> = {
  sent?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type ResetPasswordPayloadResolvers<ContextType = TGraphqlContext, ParentType extends ResolversParentTypes['ResetPasswordPayload'] = ResolversParentTypes['ResetPasswordPayload']> = {
  reset?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type SignOutPayloadResolvers<ContextType = TGraphqlContext, ParentType extends ResolversParentTypes['SignOutPayload'] = ResolversParentTypes['SignOutPayload']> = {
  signedOut?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export interface UserIdScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['UserId'], any> {
  name: 'UserId';
}

export type Resolvers<ContextType = TGraphqlContext> = {
  AuthPayload?: AuthPayloadResolvers<ContextType>;
  ChangePasswordPayload?: ChangePasswordPayloadResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Me?: MeResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RequestCodePayload?: RequestCodePayloadResolvers<ContextType>;
  ResetPasswordPayload?: ResetPasswordPayloadResolvers<ContextType>;
  SignOutPayload?: SignOutPayloadResolvers<ContextType>;
  UserId?: GraphQLScalarType;
};

