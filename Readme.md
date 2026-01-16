# @thalaguer/buzzer

**The easiest way to control your Buzz! wireless controllers in Node.js**  
Light up the LEDs, detect every button press, and bring back the PS2 game show vibes — with zero hassle. 🔔🔥

> **Note**: This library supports the **wired** Buzz! controllers (with USB dongle), not the wireless versions.

## Features

- ✅ Automatic detection and initialization
- ✅ Real-time button press/release events
- ✅ Individual LED control for up to 4 players
- ✅ Clean event-based API
- ✅ Cross-platform support (Windows, macOS, Linux)
- ✅ Built-in startup LED animation

## Installation

This package depends on `node-hid` which requires native compilation.

**Recommended installation command:**

```bash
npm install @thalaguer/buzzer
```

## Usage

```javascript
import Buzzer from '@thalaguer/buzzer';

const buzzers = Buzzer();

// Called when the system is fully initialized
buzzers.onReady(() => {
  console.log("Buzzers are ready & functional.");
  
  // Turn on player 1's LED
  buzzers.setLeds(true, false, false, false);
  
  // Or using array syntax
  buzzers.setLedsarray([true, false, true, false]); // Players 1 & 3 on
});

// Button press events
buzzers.onPress((data) => {
  console.log(`Buzzer #${data.controller} pressed the ${data.color} button(${data.button}).`);
  console.log(`Full event: ${JSON.stringify(data)}`);
});

// Button release events
buzzers.onRelease((data) => {
  console.log(`Buzzer #${data.controller} released the ${data.color} button.`);
});

// Any state change (press or release)
buzzers.onChange((data) => {
  console.log(`Buzzer #${data.controller} ${data.state} the ${data.color} button.`);
});

buzzers.onError((data) => {
  console.log(`An error occurred : ${data.message}`);
})

// Clean up when done (optional)
// await buzzers.close();
```

## API Reference

### `Buzzer()`
Creates a new buzzer manager instance.

### `onReady(callback)`
Registers a callback when the system is fully initialized. The startup LED animation will play when ready.

### `onPress(callback)`
Registers a callback for button press events. The callback receives an event object with:
- `controller`: Player number (1-4)
- `color`: Button color ('RED', 'BLUE', 'ORANGE', 'GREEN', 'YELLOW')
- `button`: Button identifier ( 0=> red, 1=> blue, 2=> orange, 3=> green, 4=> yellow)
- `state`: Event state ('press', 'released') - mostly useful for `onChange(callback)`.
### `onRelease(callback)`
Registers a callback for button release events (same event object structure as `onPress`).

### `onChange(callback)`
Registers a callback for any button state change (both press and release).

### `onError(callback)`
Registers a callback for any error happening.

### `setLeds(player1, player2, player3, player4)`
Controls the red LEDs for each player:
- `player1` - Player 1 LED (boolean)
- `player2` - Player 2 LED (boolean)
- `player3` - Player 3 LED (boolean)
- `player4` - Player 4 LED (boolean)

### `setLedsarray([player1, player2, player3, player4])`
Convenience method that accepts an array of boolean values.

### `close()`
Closes connections and releases resources. Returns a Promise.

## Windows Driver Setup (ZADIG)

On Windows, the Buzz! dongle might not work with the default driver. You need to install the WinUSB driver using ZADIG:

1. **Download ZADIG** from https://zadig.akeo.ie/

2. **Run ZADIG** as Administrator

3. **Configure ZADIG**:
   - Go to `Options` → `List All Devices`
   - Check both `Ignore Hubs or Composite Parents` and `Show only current configuration`

4. **Select the Buzz! Dongle**:
   - From the dropdown, select the Buzz! device (should appear as "Buzz!" or with VID `054C` and PID `1000`)
   - If you don't see it, try:
     - Unplugging and replugging the dongle
     - Checking if it appears under a different name
     - Trying with and without controllers connected

5. **Install/Replace Driver**:
   - Ensure the driver selected is `WinUSB` (not libusb)
   - Click `Replace Driver` or `Install Driver`
   - Wait for the installation to complete

6. **Test**:
   - Unplug and replug the dongle
   - Run your application again

**Note**: If you have multiple Buzz! dongles, repeat these steps for each one.

## Linux Permissions

On Linux, you may need to add a udev rule or run with `sudo`:

```bash
# Temporary solution (run with sudo)
sudo node your-app.js

# Permanent solution (create udev rule):
sudo nano /etc/udev/rules.d/99-buzz.rules
```

Add this line:
```
SUBSYSTEM=="usb", ATTR{idVendor}=="054c", ATTR{idProduct}=="1000", MODE="0666"
```

Then reload udev rules:
```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

## Troubleshooting

### Dongle not found
1. Check the USB connection
2. Verify the driver is installed (Windows: ZADIG)
3. Check if another application is using the device
4. Try a different USB port

### Different VID/PID
Most Buzz! dongles use `VID: 0x054c` and `PID: 0x1000`. If yours is different:

```javascript
// In your node_modules/@thalaguer/buzzer/src/config.js
export const VID = 0x054c;    // ← change to your VID
export const PID = 0x1000;    // ← change to your PID
```

To find your dongle's VID/PID:
- **Windows**: Device Manager → Properties → Details → Hardware IDs
- **Linux**: `lsusb` command
- **macOS**: System Information → USB

### No button events
1. Ensure controllers are connected to the dongle (press any button to pair)
2. Check that the dongle LED is solid (not blinking)
3. Verify your event listeners are set up before initialization completes

## Supported Controllers

This library supports the **wireless** Buzz! controllers that come with a USB dongle. Each dongle supports up to 4 controllers.

**Known compatible models:**
- Buzz! Buzzers Wireless (PS2/PS3/PC)
- Most Buzz! controllers with model number "BUZZ001" or similar

**Not tested:**
- Buzz! Wireless controllers

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.