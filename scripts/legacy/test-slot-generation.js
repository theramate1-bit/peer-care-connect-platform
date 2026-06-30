// const { isTimeOverlapping } = require('./peer-care-connect/src/lib/block-time-utils.ts');

// Mock data
const workingHours = { start: "09:00", end: "17:00" };
const date = "2025-12-29"; // Monday

// Scenario 1: Full day block
const fullDayBlock = {
  start_time: new Date(`${date}T00:00:00Z`),
  end_time: new Date(`${date}T23:59:59Z`),
  title: "Full Day Block",
};

// Scenario 2: 1 hour block (e.g., 13:00 - 14:00)
const oneHourBlock = {
  start_time: new Date(`${date}T13:00:00Z`),
  end_time: new Date(`${date}T14:00:00Z`),
  title: "Lunch Break",
};

// Scenario 3: Overlapping block (e.g., 10:30 - 11:30) - should block 10:00-11:00 and 11:00-12:00 slots if they overlap
const partialBlock = {
  start_time: new Date(`${date}T10:30:00Z`),
  end_time: new Date(`${date}T11:30:00Z`),
  title: "Meeting",
};

function generateSlots(startHour, endHour) {
  const slots = [];
  for (let i = startHour; i < endHour; i++) {
    const slotStart = new Date(
      `${date}T${i.toString().padStart(2, "0")}:00:00Z`,
    );
    const slotEnd = new Date(
      `${date}T${(i + 1).toString().padStart(2, "0")}:00:00Z`,
    );
    slots.push({ start: slotStart, end: slotEnd });
  }
  return slots;
}

// Simple overlap check implementation if we can't import (since it's TS)
function checkOverlap(blockStart, blockEnd, slotStart, slotEnd) {
  return blockStart < slotEnd && blockEnd > slotStart;
}

function runTest(scenarioName, blocks) {
  console.log(`\nTesting Scenario: ${scenarioName}`);
  const slots = generateSlots(9, 17); // 9 AM to 5 PM

  slots.forEach((slot) => {
    let isBlocked = false;
    for (const block of blocks) {
      if (
        checkOverlap(block.start_time, block.end_time, slot.start, slot.end)
      ) {
        isBlocked = true;
        console.log(
          `  Slot ${slot.start.toISOString().substr(11, 5)} - ${slot.end.toISOString().substr(11, 5)} is BLOCKED by "${block.title}" (${block.start_time.toISOString().substr(11, 5)} - ${block.end_time.toISOString().substr(11, 5)})`,
        );
        break;
      }
    }
    if (!isBlocked) {
      console.log(
        `  Slot ${slot.start.toISOString().substr(11, 5)} - ${slot.end.toISOString().substr(11, 5)} is AVAILABLE`,
      );
    }
  });
}

// Run tests
runTest("No Blocks", []);
runTest("Full Day Block", [fullDayBlock]);
runTest("One Hour Block (13:00-14:00)", [oneHourBlock]);
runTest("Partial Overlap (10:30-11:30)", [partialBlock]);
