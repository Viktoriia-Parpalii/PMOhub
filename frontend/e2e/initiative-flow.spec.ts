import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:4000/api/v1';

test('create → edit → move → conflict → delete is server-first', async ({ request }) => {
  const login = await request.post(`${api}/auth/login`, { data: {
    email: process.env.E2E_ADMIN_EMAIL ?? 'e2e-admin@example.com',
    password: process.env.E2E_ADMIN_PASSWORD ?? 'E2e_Admin_12345!',
  } });
  expect(login.ok()).toBeTruthy();
  const session = await login.json() as { access_token: string };
  const headers = { authorization: `Bearer ${session.access_token}` };

  const bootstrapResponse = await request.get(`${api}/bootstrap`, { headers });
  expect(bootstrapResponse.ok()).toBeTruthy();
  const bootstrap = await bootstrapResponse.json() as {
    data: { initiativeStatuses: Array<{ id: string; code: string }> };
  };
  const defaultStatus = bootstrap.data.initiativeStatuses.find((item) => item.code === 'DEFAULT');
  expect(defaultStatus).toBeTruthy();

  const createdResponse = await request.post(`${api}/initiatives`, { headers, data: {
    kind: 'PROJECT', name: `E2E ${Date.now()}`, year: 2099,
    strategic_goal: 'Перевірка server-first flow',
    preparation: { department_ids: [] },
  } });
  expect(createdResponse.ok()).toBeTruthy();
  const created = await createdResponse.json() as { data: { year_id: string; year_revision: number } };

  const cardResponse = await request.post(`${api}/initiative-years/${created.data.year_id}/cards`, {
    headers, data: { quarter: 'Q1' },
  });
  expect(cardResponse.ok()).toBeTruthy();
  const cardCommand = await cardResponse.json() as { data: { card_id: string } };

  const detailResponse = await request.get(`${api}/quarter-cards/${cardCommand.data.card_id}`, { headers });
  const detail = await detailResponse.json() as { data: { id: string; revision: number } };
  expect(detailResponse.ok()).toBeTruthy();

  const updateResponse = await request.patch(`${api}/quarter-cards/${detail.data.id}`, { headers, data: {
    revision: detail.data.revision, department_ids: [], status_id: defaultStatus!.id,
    notes: 'Збережено через API', custom_fields: {}, scope: [],
  } });
  expect(updateResponse.ok()).toBeTruthy();
  const updated = await updateResponse.json() as { data: { revision: number } };

  const moveResponse = await request.post(`${api}/quarter-cards/${detail.data.id}/move`, { headers, data: {
    revision: updated.data.revision, to_year: 2099, to_quarter: 'Q2',
  } });
  expect(moveResponse.ok()).toBeTruthy();
  const moved = await moveResponse.json() as { data: { card_revision: number } };

  const staleUpdate = await request.patch(`${api}/quarter-cards/${detail.data.id}`, { headers, data: {
    revision: updated.data.revision, department_ids: [], status_id: defaultStatus!.id,
    notes: 'Цей запис не має бути застосовано', custom_fields: {}, scope: [],
  } });
  expect(staleUpdate.status()).toBe(409);
  await expect(staleUpdate.json()).resolves.toMatchObject({ success: false, code: 'REVISION_CONFLICT' });

  const deleteCard = await request.delete(`${api}/quarter-cards/${detail.data.id}?revision=${moved.data.card_revision}`, { headers });
  expect(deleteCard.ok()).toBeTruthy();
  const deleteYear = await request.delete(`${api}/initiative-years/${created.data.year_id}?revision=${created.data.year_revision}`, { headers });
  expect(deleteYear.ok()).toBeTruthy();

  const logout = await request.post(`${api}/auth/logout`);
  expect(logout.ok()).toBeTruthy();
});
