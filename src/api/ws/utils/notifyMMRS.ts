export async function notifyMMRSOpponentConfirmed(userId: number): Promise<void> {
  try {
    await fetch(`http://localhost:5000/mmrs/internal/opponent-confirmed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId})
    });
    console.log(`Notified MMRS: opponent confirmed for user ${userId}`);
  } catch (err) {
    console.error(`Failed to notify MMRS about opponent confirmation:`, err);
  }
}
