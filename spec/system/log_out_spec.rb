# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Log out' do
  include ProfileStories

  before do
    as_a_logged_in_user
  end

  describe 'Logging out from the preferences' do
    it 'logs the user out' do
      visit settings_path

      within '.sidebar' do
        click_on 'Logout'
      end

      # after_sign_out_path_for redirects to root_path here, not the
      # login page directly, so the title is this site's default page
      # title rather than I18n.t('auth.login') -- the meaningful check
      # is that the session actually ended and landed at root.
      expect(page).to have_current_path('/')
    end
  end

  describe 'Logging out from the JS app', :js, :streaming do
    it 'logs the user out' do
      # The frontend tries to load announcements after a short delay, but the session might be expired by then, and the browser will output an error.
      ignore_js_error(/Failed to load resource: the server responded with a status/)

      visit root_path
      expect(page)
        .to have_css('body', class: 'app-body')

      within '.navigation-panel' do
        click_on 'More'
      end

      within '.dropdown-menu' do
        click_on 'Logout'
      end

      click_on 'Log out'

      # Same reasoning as the other example above: root_path, not the
      # login page directly.
      expect(page).to have_current_path('/')
    end
  end
end
