// When this app is loaded as a Module Federation remote inside the
// OneSphere-Accounts host, the access token deliberately lives ONLY in that
// host's in-memory TokenService (never sessionStorage/a cookie) -- see
// OneSphere-Accounts/src/app/core/services/token.service.ts. That service
// installs a live getter on the shared `window` (same page, same JS realm
// under federation) so this app can still reach the real token.
//
// core/Interceptor/Interceptor.ts already reads the token this way for the
// generic request pipeline, but several services here build their own
// Authorization header directly (so they already carry a header by the time
// the interceptor runs, and its "don't overwrite an existing header" guard
// then leaves their broken, empty `Bearer ` in place). Any such service must
// call this helper instead of reading `sessionStorage.getItem('token')`
// directly, or every one of its calls silently 401s ("Authentication
// required.") under the real served app the moment it's federated in --
// sessionStorage['token'] is never populated there. Falls back to
// sessionStorage['token'] for standalone/non-federated use, matching the
// interceptor's own fallback.
export function currentAccessToken(): string {
  const bridge = (window as unknown as { __oneSphereGetAccessToken?: () => string | null }).__oneSphereGetAccessToken;
  const bridged = bridge?.();
  return bridged || sessionStorage.getItem('token') || '';
}
