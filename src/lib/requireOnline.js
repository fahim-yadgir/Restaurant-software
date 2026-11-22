
export function requireOnline() {
  if (!navigator.onLine) {
    throw new Error(
      'Internet connection is required for this operation. Please connect and try again.'
    )
  }
}

export async function runOnline(action) {
  requireOnline()
  return await action()
}
