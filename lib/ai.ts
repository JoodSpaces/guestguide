/** The AI features (concierge, manual search, request sorting) need an Anthropic key. Without one the app runs normally,
 *  the concierge page offers the human team instead, and requests are filed under "other / normal" for staff to sort. */
export const aiEnabled = (): boolean => !!process.env.ANTHROPIC_API_KEY;
