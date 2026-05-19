# frozen_string_literal: true

# == Schema Information
#
# Table name: announcements
#
#  id                   :bigint           not null, primary key
#  all_day              :boolean          default(FALSE), not null
#  ends_at              :datetime
#  notification_sent_at :datetime
#  published            :boolean          default(FALSE), not null
#  published_at         :datetime
#  scheduled_at         :datetime
#  starts_at            :datetime
#  status_ids           :bigint           is an Array
#  text                 :text             default(""), not null
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#
Fabricator(:announcement) do
  text      { Faker::Lorem.paragraph(sentence_count: 2) }
  published true
  starts_at nil
  ends_at   nil
end
