# Agent Note: Local selection AI editing context

Status: implemented

## Problem

The screenplay workspace had no way to carry a precise text selection into the existing conversation composer. Users had to copy text manually and could not distinguish the current conversation from a new project conversation.

## Decision

The editor exposes a shared selection descriptor for CodeMirror and Milkdown, including text, character offsets, one-based line bounds, and viewport geometry. The workspace keeps a selection snapshot and presents a bounded floating editor with an instruction field and explicit current/new conversation actions. Actions append a formatted file/range/selection block to the addressed session draft through the existing conversation input service; they never submit automatically. A new-session action creates a distinct session in the active workspace, opens it, then performs the same draft hand-off.

## Alternatives considered

**Submitting immediately.** Rejected because selecting text should not trigger an implicit model request and would prevent instruction review.

**Creating a second chat transport.** Rejected because it would bypass the existing session log and composer state; the feature uses the established scope-addressed input service.

## Consequences

Selection context is available to the model once the user sends the composer draft and remains reconstructable from the logged prompt. The editor UI now owns a small local popover state and the runtime session contract exposes distinct session creation to support the new-conversation action. Diff preview and file write-back remain the agent's existing tool workflow; this change only supplies precise context and draft hand-off.
