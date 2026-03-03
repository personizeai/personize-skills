/**
 * HubSpot helpers using the official @hubspot/api-client.
 *
 * Auth: Use a Private App access token (Settings > Integrations > Private Apps).
 * Required scopes: crm.objects.contacts.read, crm.objects.contacts.write,
 *                  crm.objects.deals.read, crm.objects.companies.read
 */
import { Client as HubSpotClient } from "@hubspot/api-client";

let _client: HubSpotClient | null = null;

export function getHubSpotClient(): HubSpotClient {
  if (!_client) {
    _client = new HubSpotClient({
      accessToken: process.env.HUBSPOT_ACCESS_TOKEN!,
    });
  }
  return _client;
}

/** Fetch a contact by email with common properties. */
export async function getContactByEmail(email: string) {
  const client = getHubSpotClient();
  try {
    const response = await client.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            { propertyName: "email", operator: "EQ", value: email },
          ],
        },
      ],
      properties: [
        "firstname", "lastname", "email", "phone", "company",
        "jobtitle", "lifecyclestage", "hs_lead_status",
        "notes_last_updated", "hubspot_owner_id",
      ],
      limit: 1,
      after: "0",
      sorts: [],
    });
    return response.results[0] || null;
  } catch {
    return null;
  }
}

/** Fetch recently created contacts (last N hours). */
export async function getRecentContacts(hoursAgo: number = 24, limit: number = 100) {
  const client = getHubSpotClient();
  const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

  const response = await client.crm.contacts.searchApi.doSearch({
    filterGroups: [
      {
        filters: [
          { propertyName: "createdate", operator: "GTE", value: since },
        ],
      },
    ],
    properties: [
      "firstname", "lastname", "email", "phone", "company",
      "jobtitle", "lifecyclestage", "hs_lead_status",
    ],
    limit,
    after: "0",
    sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
  });

  return response.results;
}

/** Update a contact's properties in HubSpot. */
export async function updateContact(
  contactId: string,
  properties: Record<string, string>
) {
  const client = getHubSpotClient();
  return client.crm.contacts.basicApi.update(contactId, { properties });
}

/** Create a note/engagement on a contact. */
export async function createNote(contactId: string, body: string) {
  const client = getHubSpotClient();
  return client.crm.objects.notes.basicApi.create({
    properties: {
      hs_note_body: body,
      hs_timestamp: new Date().toISOString(),
    },
    associations: [
      {
        to: { id: contactId },
        types: [
          { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 },
        ],
      },
    ],
  });
}
