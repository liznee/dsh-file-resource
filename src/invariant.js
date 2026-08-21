const PACKAGE_NAME = 'dsh-image-upload'

export const name = 'dsh-image-upload-invariant'
export const inject = ['invariants']

export function apply(ctx) {
  return Promise.resolve(ctx.invariants.register(PACKAGE_NAME, () => {}))
}
