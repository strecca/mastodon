# frozen_string_literal: true


Rails.application.configure do
  config.active_record.encryption.deterministic_key = 'tfr4CgG3SHtA0x68PiCiUOeaMUPvYDQo'
  config.active_record.encryption.key_derivation_salt = 'kVduKaF8v0isMHOC3FA7BAQtSCIXSquD'
  config.active_record.encryption.primary_key = 'WlLzxBbFwPX6HF8S5tRZVboPh0D54VaH'
  config.active_record.encryption.support_sha1_for_non_deterministic_encryption = true
end
