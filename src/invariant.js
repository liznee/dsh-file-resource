const PACKAGE_NAME = 'dsh-file-upload'

export const name = 'dsh-file-upload-invariant'
export const inject = ['invariants']

export function apply(ctx) {
  return Promise.resolve(ctx.invariants.register(PACKAGE_NAME, () => {}))
}
