import React from 'react';

// `useEffect` is not invoked during server rendering, meaning
// we can use this to determine if we're on the server or not.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  const [value, setValue] = React.useState<S | C>(server);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- effect가 서버에서 실행되지 않는다는 성질 자체가 이 훅의 구현이다(Expo 템플릿).
    setValue(client);
  }, [client]);

  return value;
}
