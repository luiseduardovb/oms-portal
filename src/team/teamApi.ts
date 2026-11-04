import type { components } from "@/api/generated/schema";
import { baseApi } from "@/api/baseApi";

type Schemas = components["schemas"];
export type Member = Schemas["MemberOut"];
export type Role = Schemas["RoleOut"];
export type Invitation = Schemas["InvitationOut"];
export type CreatedInvitation = Schemas["InvitationCreated"];
export type InvitationPreview = Schemas["InvitationPreview"];
export type AcceptInput = Schemas["AcceptInvitation"];
export type AcceptedInvitation = Schemas["AcceptedInvitation"];
export type MemberChanges = Schemas["MemberUpdate"];
export type InviteInput = Schemas["InvitationCreate"];

export const teamApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    members: build.query<Member[], void>({
      query: () => ({ url: "/team/members" }),
      providesTags: ["Members"],
    }),
    roles: build.query<Role[], void>({
      query: () => ({ url: "/team/roles" }),
    }),
    updateMember: build.mutation<void, { id: number; changes: MemberChanges }>({
      query: ({ id, changes }) => ({
        url: `/team/members/${id}`,
        method: "PATCH",
        data: changes,
      }),
      invalidatesTags: ["Members"],
    }),
    removeMember: build.mutation<void, number>({
      query: (id) => ({ url: `/team/members/${id}`, method: "DELETE" }),
      invalidatesTags: ["Members"],
    }),
    invitations: build.query<Invitation[], void>({
      query: () => ({ url: "/team/invitations" }),
      providesTags: ["Invitations"],
    }),
    createInvitation: build.mutation<CreatedInvitation, InviteInput>({
      query: (data) => ({ url: "/team/invitations", method: "POST", data }),
      invalidatesTags: ["Invitations"],
    }),
    revokeInvitation: build.mutation<void, number>({
      query: (id) => ({ url: `/team/invitations/${id}`, method: "DELETE" }),
      invalidatesTags: ["Invitations"],
    }),
    previewInvitation: build.query<InvitationPreview, string>({
      query: (token) => ({
        url: "/team/invitations/preview",
        params: { token },
      }),
    }),
    acceptInvitation: build.mutation<AcceptedInvitation, AcceptInput>({
      query: (data) => ({
        url: "/team/invitations/accept",
        method: "POST",
        data,
      }),
    }),
  }),
});

export const {
  useMembersQuery,
  useRolesQuery,
  useUpdateMemberMutation,
  useRemoveMemberMutation,
  useInvitationsQuery,
  useCreateInvitationMutation,
  useRevokeInvitationMutation,
  usePreviewInvitationQuery,
  useAcceptInvitationMutation,
} = teamApi;

/** The address a person opens to accept an invitation. */
export function invitationLink(origin: string, token: string): string {
  return `${origin}/accept-invitation?token=${encodeURIComponent(token)}`;
}

export function whatsappLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
