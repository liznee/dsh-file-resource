const PACKAGE_NAME = 'dsh-file-resource'

export const name = 'dsh-file-resource-invariant'
export const inject = ['invariants']

export function apply(ctx) {
  return Promise.resolve(ctx.invariants.register(PACKAGE_NAME, () => {}))
}
