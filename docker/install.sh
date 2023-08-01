#!/bin/sh

# check if directory /extensions is mounted and copy extension into that dir
[ -d /extensions ] && (echo "Found extension directory on /extensions, copying ext to that directory" && cp -r /app/* /extensions/) || echo "No extension directory found on /extensions, skipping copy"