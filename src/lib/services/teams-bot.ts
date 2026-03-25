// Teams Graph API service — Option A: transcript pull (no Azure VM needed)

interface TeamsCredentials {
  clientId: string;
  tenantId: string;
  clientSecret: string;
}

interface TeamsCallSession {
  callId: string;
  accessToken: string;
  joinedAt: Date;
}

/**
 * Get Azure AD access token using client_credentials flow
 */
export async function getTeamsAccessToken(creds: TeamsCredentials): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${creds.tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Teams auth failed: ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Join a Teams meeting via Graph API
 * The bot appears as a participant in the meeting roster
 */
export async function joinTeamsMeeting(
  accessToken: string,
  joinUrl: string,
  botName: string = 'Azmyra Bot'
): Promise<string> {
  const callbackUri = process.env.NEXTAUTH_URL
    ? `${process.env.NEXTAUTH_URL}/api/bot/callback`
    : 'https://ai.theproductowner.org/api/bot/callback';

  const { meetingId, passcode, threadId } = parseMeetingUrl(joinUrl);

  // Build request body based on URL format
  const requestBody: any = {
    '@odata.type': '#microsoft.graph.call',
    callbackUri,
    requestedModalities: ['audio'],
    mediaConfig: {
      '@odata.type': '#microsoft.graph.serviceHostedMediaConfig',
    },
  };

  if (meetingId) {
    // New-style URL: /meet/<id>?p=<passcode>
    requestBody.meetingInfo = {
      '@odata.type': '#microsoft.graph.joinMeetingIdMeetingInfo',
      joinMeetingId: meetingId,
      passcode: passcode || null,
    };
  } else if (threadId) {
    // Classic URL: /l/meetup-join/<threadId>/...
    requestBody.chatInfo = {
      '@odata.type': '#microsoft.graph.chatInfo',
      threadId,
      messageId: '0',
    };
    requestBody.meetingInfo = {
      '@odata.type': '#microsoft.graph.organizerMeetingInfo',
      organizer: {
        '@odata.type': '#microsoft.graph.identitySet',
        user: {
          '@odata.type': '#microsoft.graph.identity',
          displayName: botName,
        },
      },
    };
    requestBody.tenantId = process.env.AZURE_AD_TENANT_ID;
  } else {
    throw new Error('Could not parse Teams meeting URL. Supported formats: teams.microsoft.com/meet/... or teams.microsoft.com/l/meetup-join/...');
  }

  const res = await fetch('https://graph.microsoft.com/v1.0/communications/calls', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to join Teams meeting: ${err}`);
  }

  const data = await res.json();
  return data.id; // callId
}

/**
 * Fetch meeting transcript via Graph API
 * Teams must have transcription enabled for this to work
 */
export async function getTeamsTranscript(
  accessToken: string,
  meetingId: string
): Promise<string> {
  // First, get the online meeting details
  const meetingsRes = await fetch(
    `https://graph.microsoft.com/v1.0/communications/onlineMeetings?$filter=joinWebUrl eq '${encodeURIComponent(meetingId)}'`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!meetingsRes.ok) {
    // Fallback: try to get call records
    return await getCallRecordTranscript(accessToken, meetingId);
  }

  const meetings = await meetingsRes.json();
  const meeting = meetings.value?.[0];
  if (!meeting) {
    return await getCallRecordTranscript(accessToken, meetingId);
  }

  // Get transcripts for this meeting
  const transcriptsRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meeting.id}/transcripts`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!transcriptsRes.ok) {
    return await getCallRecordTranscript(accessToken, meetingId);
  }

  const transcripts = await transcriptsRes.json();
  const transcript = transcripts.value?.[0];
  if (!transcript) {
    return 'No transcript available. Ensure Teams transcription is enabled for your organization.';
  }

  // Get transcript content
  const contentRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meeting.id}/transcripts/${transcript.id}/content?$format=text/vtt`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!contentRes.ok) {
    return 'Failed to retrieve transcript content.';
  }

  const vttContent = await contentRes.text();
  return parseVttToPlainText(vttContent);
}

/**
 * Leave a Teams call
 */
export async function leaveTeamsCall(accessToken: string, callId: string): Promise<void> {
  await fetch(`https://graph.microsoft.com/v1.0/communications/calls/${callId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/**
 * Validate Teams credentials by requesting a token
 */
export async function testTeamsConnection(creds: TeamsCredentials): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getTeamsAccessToken(creds);
    // Verify the token works by making a simple Graph API call
    const res = await fetch('https://graph.microsoft.com/v1.0/communications/getPresencesByUserId', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: [] }),
    });
    // Even a 400 means auth worked
    return { success: res.status !== 401 };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── helpers ──────────────────────────────────────────────────────────

async function getCallRecordTranscript(accessToken: string, callId: string): Promise<string> {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/communications/callRecords/${callId}?$expand=sessions($expand=segments)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) return 'Transcript not available for this call.';
  const data = await res.json();
  // Extract any available transcript data from segments
  const segments = data.sessions?.flatMap((s: any) => s.segments || []) || [];
  if (segments.length === 0) return 'No call segments found.';
  return segments.map((seg: any) =>
    `[${seg.caller?.identity?.user?.displayName || 'Unknown'}]: ${seg.media?.map((m: any) => m.label).join(', ') || ''}`
  ).join('\n');
}

function parseMeetingUrl(joinUrl: string): { meetingId?: string; passcode?: string; threadId?: string } {
  // New format: https://teams.microsoft.com/meet/<meetingId>?p=<passcode>
  const meetMatch = joinUrl.match(/\/meet\/([^?/]+)/);
  if (meetMatch) {
    const passcodeMatch = joinUrl.match(/[?&]p=([^&]+)/);
    return {
      meetingId: meetMatch[1],
      passcode: passcodeMatch ? passcodeMatch[1] : undefined,
    };
  }

  // Classic format: https://teams.microsoft.com/l/meetup-join/<threadId>/...
  const threadMatch = joinUrl.match(/meetup-join\/([^/]+)\//);
  if (threadMatch) {
    return { threadId: decodeURIComponent(threadMatch[1]) };
  }

  return {};
}

function extractTenantFromToken(token: string): string {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.tid || '';
  } catch {
    return '';
  }
}

function parseVttToPlainText(vtt: string): string {
  return vtt
    .split('\n')
    .filter(line => !line.startsWith('WEBVTT') && !line.match(/^\d{2}:\d{2}/) && !line.match(/^$/) && !line.match(/^\d+$/))
    .map(line => line.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean)
    .join('\n');
}
