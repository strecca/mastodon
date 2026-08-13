import api, { getAsyncRefreshHeader } from 'flavours/glitch/api';

export type ApiWelcomeDigestState = 'available' | 'generating' | 'none';

interface ApiWelcomeDigestResponse {
  state: ApiWelcomeDigestState;
  content?: string | null;
}

export const apiGetWelcomeDigest = async () => {
  const response = await api().get<ApiWelcomeDigestResponse>(
    '/api/v1/member_welcome_digest',
  );

  return {
    state: response.data.state,
    content: response.data.content ?? null,
    refresh: getAsyncRefreshHeader(response),
  };
};

export const apiMarkWelcomeDigestRead = () =>
  api().post('/api/v1/member_welcome_digest/read');
