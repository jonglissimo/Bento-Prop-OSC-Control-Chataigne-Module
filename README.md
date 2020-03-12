# Bento Prop OSC Control Chataigne Module

This chataigne module let's you control Bento LED props (e.g. Flowtoys Creator Club) through their OSC API.

It offers chataigne commands for each Bento OSC command that can be used in Action/Trigger Consequences or Mapping outputs.

## How to work with this module?

On init the module loads the active local IP addresses in the parameter "Local IP". Select the IP address that corresponds to the network your Bento clubs are operating in. The broadcast IP is automatically updated when the local IP is selected.

### Detecting props

When clicking "Detect Props" the detected props will be added in the values container.
You have direct access to restart and sleep (shutdown) the prop.
Additionally, there are parameters with the battery level and IMU orientation.
All other interaction with the props should be done through the commands.

### Commands

By default, all commands are broadcast to all props on the network.
You can specify the "Prop Index" Parameter on the command to send the command to one individual prop. The index is the first number in the values/props container.
