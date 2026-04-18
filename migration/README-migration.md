# Claude Switch Migration Guide (Ubuntu)

## Files

- `migration/claude-provider-switch.sh`
- `migration/claude-switch-bundle.tar.gz.b64`

## 1) Pull latest from GitHub

```bash
git pull
```

## 2) Install the switch script

```bash
mkdir -p ~/.local/bin ~/.claude
cp migration/claude-provider-switch.sh ~/.local/bin/claude-provider-switch
chmod +x ~/.local/bin/claude-provider-switch
```

## 3) Restore settings/profile from bundle (optional)

```bash
base64 -d migration/claude-switch-bundle.tar.gz.b64 > /tmp/claude-switch-bundle.tar.gz
tar -xzf /tmp/claude-switch-bundle.tar.gz -C /tmp
cp /tmp/settings.json ~/.claude/settings.json
cp /tmp/gateway_profile.json ~/.claude/gateway_profile.json
chmod 600 ~/.claude/settings.json ~/.claude/gateway_profile.json
```

## 4) Validate

```bash
~/.local/bin/claude-provider-switch status
~/.local/bin/claude-provider-switch test
```

## 5) Common commands

```bash
~/.local/bin/claude-provider-switch official
~/.local/bin/claude-provider-switch gateway
~/.local/bin/claude-provider-switch toggle
```
