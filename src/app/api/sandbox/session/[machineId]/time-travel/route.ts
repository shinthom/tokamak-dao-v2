import { NextResponse } from "next/server";
import { anvilRpc } from "../../../lib/fly";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ machineId: string }> }
) {
  const { machineId } = await params;
  const { seconds } = await request.json();

  if (typeof seconds !== "number" || seconds <= 0) {
    return NextResponse.json(
      { error: "seconds must be a positive number" },
      { status: 400 }
    );
  }

  try {
    // Mine blocks with 12s intervals to advance both block number AND timestamp.
    // Governance contract uses block.number for votingDelay/votingPeriod checks,
    // so we must advance blocks proportionally (12s/block = Ethereum mainnet rate).
    const BLOCK_TIME = 12;
    const blocks = Math.max(1, Math.ceil(seconds / BLOCK_TIME));
    await anvilRpc(machineId, "anvil_mine", [blocks, BLOCK_TIME]);
    return NextResponse.json({ success: true, blocks });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to time travel",
      },
      { status: 500 }
    );
  }
}
