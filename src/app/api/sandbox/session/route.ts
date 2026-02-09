import { NextResponse } from "next/server";
import {
  createMachine,
  waitForMachine,
  deployContracts,
  fundWallet,
  getMachine,
} from "../lib/fly";

export async function POST(request: Request) {
  const { address } = await request.json();

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json(
      { error: "Valid address required" },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        send({ step: "creating", message: "Creating sandbox..." });
        const machineId = await createMachine();

        send({ step: "starting", message: "Starting Anvil..." });
        await waitForMachine(machineId);

        send({
          step: "deploying",
          message: "Deploying contracts...",
          progress: 50,
        });
        const addresses = await deployContracts(machineId);

        send({
          step: "funding",
          message: "Funding wallet...",
          progress: 80,
        });
        await fundWallet(machineId, address);

        send({
          step: "done",
          machineId,
          rpcUrl: "/api/sandbox/rpc",
          addresses,
        });
      } catch (error) {
        send({
          step: "error",
          message:
            error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const machineId = searchParams.get("machineId");

  if (!machineId) {
    return NextResponse.json(
      { error: "machineId required" },
      { status: 400 }
    );
  }

  try {
    const machine = await getMachine(machineId);
    return NextResponse.json({ machineId, state: machine.state });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get machine",
      },
      { status: 500 }
    );
  }
}
