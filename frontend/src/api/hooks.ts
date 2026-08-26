import { useQuery } from '@tanstack/react-query';
import { OperationalTask, Project } from '../shared/types';
import { apiRequest, loadBootstrap, loadInitiativeCard, loadInitiativeYear, loadInitiatives } from './apiClient';
import { queryKeys } from './queryClient';

export const useBootstrapQuery = (enabled: boolean) => useQuery({
  queryKey: queryKeys.bootstrap,
  queryFn: ({ signal }) => loadBootstrap(signal),
  enabled,
  staleTime: 30_000,
});

export const useProjectsQuery = (enabled: boolean) => useQuery({ queryKey: queryKeys.initiatives('project'), queryFn: ({ signal }) => loadInitiatives<Project>('project', signal), enabled });
export const useTasksQuery = (enabled: boolean) => useQuery({ queryKey: queryKeys.initiatives('task'), queryFn: ({ signal }) => loadInitiatives<OperationalTask>('task', signal), enabled });
export const useInitiativeCardQuery = (id?: string) => useQuery({ queryKey: queryKeys.initiativeCard(id ?? ''), queryFn: ({ signal }) => loadInitiativeCard(id!, signal).then((response) => response.data), enabled: Boolean(id) });
export const useInitiativeYearQuery = (id?: string) => useQuery({ queryKey: queryKeys.initiativeYear(id ?? ''), queryFn: ({ signal }) => loadInitiativeYear(id!, signal).then((response) => response.data), enabled: Boolean(id) });
export const useAuditQuery = (aggregateType?: string, aggregateId?: string) => useQuery({
  queryKey: queryKeys.audit(aggregateType ?? '', aggregateId ?? ''),
  queryFn: ({ signal }) => apiRequest<Array<{ id: string; date: string; author: string; action: string; code: string }>>(`/audit/${aggregateType}/${aggregateId}`, { signal }),
  enabled: Boolean(aggregateType && aggregateId),
});
