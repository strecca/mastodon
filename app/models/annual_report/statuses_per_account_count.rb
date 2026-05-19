# frozen_string_literal: true

# == Schema Information
#
# Table name: annual_report_statuses_per_account_counts
#
#  id             :bigint           not null, primary key
#  statuses_count :bigint           not null
#  year           :integer          not null
#  account_id     :bigint           not null
#
# Indexes
#
#  idx_on_year_account_id_ff3e167cef  (year,account_id) UNIQUE
#

class AnnualReport::StatusesPerAccountCount < ApplicationRecord
  # This table facilitates percentile calculations
end
