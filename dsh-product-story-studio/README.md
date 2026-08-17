# Story Studio Product Bundle

This private workspace owns the install-time Story Studio Profile composition.
Its production dependencies are packaged with DSH Desktop and resolved through
the installation fallback, so end users do not run plugin installation commands
or contact GitHub when the Profile starts.

`dsh-drop-to-path` is pinned to commit
`a00a5a2e18fd89e829b1c96f2f2e85af67366e10` and retains its upstream MIT
license inside the packaged dependency.
