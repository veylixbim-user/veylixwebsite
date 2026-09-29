"use client";

import * as React from "react";

/**
 * Runs a server action from a form WITHOUT React's automatic form reset. With `<form action={fn}>` React 19 clears every
 * uncontrolled field after the action finishes — even when it returned a validation error — so someone who mistyped one
 * value would lose everything else they typed. This keeps the fields as they are.
 */
export function useKeepFormAction<S>(action: (prev: S | undefined, fd: FormData) => Promise<S>) {
  const [state, setState] = React.useState<S | undefined>(undefined);
  const [pending, start] = React.useTransition();
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      setState(await action(state, fd));
    });
  };
  return [state, onSubmit, pending] as const;
}
