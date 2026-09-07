# frozen_string_literal: true

class ManifestSerializer < ActiveModel::Serializer
  include InstanceHelper
  include RoutingHelper
  include ActionView::Helpers::TextHelper

  attributes :id, :name, :short_name,
             :icons, :theme_color, :background_color,
             :display, :start_url, :scope,
             :share_target, :shortcuts,
             :prefer_related_applications, :related_applications

  def id
    # This is set to `/home` because that was the old value of `start_url` and
    # thus the fallback ID computed by Chrome:
    # https://developer.chrome.com/blog/pwa-manifest-id/
    '/home'
  end

  def name
    object.title
  end

  def short_name
    object.title
  end

  def icons
    # Separate 'any' and 'maskable' entries per size, rather than the
    # combined 'any maskable' value on one entry -- a maskable icon needs
    # safe-zone padding for OS-level shape cropping, which isn't the same
    # image as a plain icon; browsers that treat these as distinct purposes
    # get more consistent results from separate entries.
    SiteUpload::ANDROID_ICON_SIZES.flat_map do |size|
      src = app_icon_path(size.to_i)
      src = URI.join(root_url, src).to_s if src.present?
      src ||= frontend_asset_url("icons/android-chrome-#{size}x#{size}.png")

      %w(any maskable).map do |purpose|
        {
          src: src,
          sizes: "#{size}x#{size}",
          type: 'image/png',
          purpose: purpose,
        }
      end
    end
  end

  def theme_color
    '#191b22'
  end

  def background_color
    '#191b22'
  end

  def display
    'standalone'
  end

  def start_url
    '/'
  end

  def scope
    '/'
  end

  def share_target
    {
      url_template: 'share?title={title}&text={text}&url={url}',
      action: 'share',
      method: 'GET',
      enctype: 'application/x-www-form-urlencoded',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
      },
    }
  end

  def shortcuts
    [
      {
        name: 'Community Directory',
        url: '/community',
      },
      {
        name: 'Community Events',
        url: '/community_events',
      },
      {
        name: 'Community Listings',
        url: '/community_listings',
      },
    ]
  end

  def prefer_related_applications
    false
  end

  def related_applications
    []
  end
end
