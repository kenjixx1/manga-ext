#!/bin/zsh
# Build Comix K signed with the real key (from ~/.manga-ext-signing), so a local JAR can replace the installed one
# in Tachimanga. The key is copied in only for the build and always removed. Prints the JAR copy to install.
set -e
cd "$(dirname "$0")/.."
KEY_DIR=~/.manga-ext-signing
trap 'rm -f signingkey.jks' EXIT
cp "$KEY_DIR/signingkey.jks" signingkey.jks
ALIAS=manga-ext KEY_STORE_PASSWORD="$(cat $KEY_DIR/password.txt)" KEY_PASSWORD="$(cat $KEY_DIR/password.txt)" \
  ANDROID_HOME=$HOME/Library/Android/sdk ./gradlew -q :src:en:comix:assembleRelease
python3 tools/check_source_info.py src/en/comix/build/keiyoushi-source-info.json
jar=$(ls -t src/en/comix/build/outputs/jar/release/*.jar | head -1)
mkdir -p /tmp/comix-k-builds
cp "$jar" /tmp/comix-k-builds/
echo "/private/tmp/comix-k-builds/$(basename "$jar")"
