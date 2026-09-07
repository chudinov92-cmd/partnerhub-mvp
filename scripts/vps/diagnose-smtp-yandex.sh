#!/usr/bin/env bash
# Обратная совместимость — см. diagnose-auth-email.sh
exec bash "$(dirname "$0")/diagnose-auth-email.sh" "$@"
