/**
 * KOU Racing — Binary Telemetry Packet Parser
 *
 * Protocol: End-to-End Raw Binary (Little-Endian)
 * Packet size: exactly 28 bytes
 *
 * Layout:
 *   Byte  0– 3  sequence_id     Uint32  (LE)
 *   Byte  4– 7  rpm             Float32 (LE)
 *   Byte  8–11  speed           Float32 (LE)
 *   Byte 12–15  motor_temp      Float32 (LE)
 *   Byte 16–19  battery_voltage Float32 (LE)
 *   Byte 20–23  throttle        Float32 (LE)
 *   Byte 24–27  fault           Uint32  (LE) — 1 = fault present, 0 = clear
 */

export const PACKET_SIZE = 28 as const;

export interface ParsedPacket {
  sequence_id: number;
  rpm: number;
  speed: number;
  motor_temp: number;
  battery_voltage: number;
  throttle: number;
  /** true when fault code > 0 */
  fault: boolean;
  /** Human-readable fault label or 'None' */
  fault_type: string;
  /** Raw fault code from Uint32 field */
  fault_code: number;
}

/**
 * Parses a single 28-byte ArrayBuffer into a `ParsedPacket`.
 *
 * Returns `null` if the buffer is not exactly 28 bytes (malformed / partial packet).
 * All values are read as Little-Endian per the protocol spec.
 *
 * @example
 * ws.onmessage = (e) => {
 *   const packet = parseTelemetryPacket(e.data);
 *   if (packet) incomingBuffer.push(packet);
 * };
 */
export function parseTelemetryPacket(buffer: ArrayBuffer): ParsedPacket | null {
  if (buffer.byteLength !== PACKET_SIZE) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[TelemetryParser] Unexpected packet size: ${buffer.byteLength} bytes (expected ${PACKET_SIZE}). Dropping.`
      );
    }
    return null;
  }

  const v = new DataView(buffer);

  // Little-Endian = true (second arg)
  const sequence_id     = v.getUint32( 0, true);
  const rpm             = v.getFloat32( 4, true);
  const speed           = v.getFloat32( 8, true);
  const motor_temp      = v.getFloat32(12, true);
  const battery_voltage = v.getFloat32(16, true);
  const throttle        = v.getFloat32(20, true);
  const fault_code      = v.getUint32(24, true);

  const fault = fault_code > 0;
  const fault_type = fault ? `FAULT_${fault_code}` : 'None';

  return {
    sequence_id,
    rpm,
    speed,
    motor_temp,
    battery_voltage,
    throttle,
    fault,
    fault_type,
    fault_code,
  };
}
