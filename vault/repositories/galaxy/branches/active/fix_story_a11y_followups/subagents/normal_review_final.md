# Final normal review

Approved, with no outstanding correctness findings. Fresh review completed 2026-10-19 after reading the complete dev-to-working-tree delta and the surrounding classic Popper controller and consumers.

ChatInput's explicit name reaches its real GButton/native button in all four tested states without changing disabled or submission behavior. The native Popper close button is named, non-submit, and retains its appearance while acquiring native keyboard activation. The CSS explicitly outranks Galaxy's Bootstrap active rules and leaves a visible focus outline.

Both close-button activation and Escape bubbling from popup content now invoke the same close handler. It captures whether focus belongs to the popup before hiding it and returns that focus to the external reference or the invoking control in the generated reference wrapper. It does not steal focus from elsewhere. The existing document Escape listener may subsequently set visible false again, which is harmless; it does not toggle or override the restored focus. The component does not stop Escape propagation, so existing application/document handlers retain their behavior.

Closed and disabled poppers remain hidden via v-show, covering their tab stops. Untitled rendering is unchanged. The separate delegated `.popper-close` class used by Markdown CellAdd remains compatible. No current production consumer supplies the built-in title, so component/browser fixtures are especially relevant; the public titled API is now correct without importing story infrastructure into dev.

No assertions were weakened. The fresh Escape regression observes focused control, resulting visibility, and restored DOM focus through public interactions. Browser activation/visual checks remain assigned to the following screenshot phase. No source edits or Git operations were performed during this review.
