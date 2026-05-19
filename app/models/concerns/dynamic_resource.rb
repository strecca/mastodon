# frozen_string_literal: true

module DynamicResource
    extend ActiveSupport::Concern
  
    included do
      belongs_to :account, class_name: 'Account', optional: false
  
      # Optional: scope for public resources
      scope :publicly_visible, -> { where(public: true) } if column_names.include?('public')
    end
  end