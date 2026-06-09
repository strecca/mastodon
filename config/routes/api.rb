# frozen_string_literal: true

namespace :api, format: false do
  # OEmbed
  get '/oembed', to: 'oembed#show', as: :oembed

  # Experimental JSON / REST API
  namespace :v1_alpha do
    resources :accounts, only: [] do
      resources :collections, only: [:index]
      resources :in_collections, only: [:index]
    end

    resources :async_refreshes, only: :show

    resources :collections, only: [:show, :create, :update, :destroy] do
      resources :items, only: [:create, :destroy], controller: 'collection_items' do
        member do
          post :revoke
        end
      end
    end
  end

  # JSON / REST API
  namespace :v1 do
    resources :community_artists,     only: [:index, :show, :create, :update, :destroy]
    resources :community_services,    only: [:index, :show, :create, :update, :destroy]
    resources :community_restaurants, only: [:index, :show, :create, :update, :destroy]
    resources :community_properties,  only: [:index, :show, :create, :update, :destroy]
    resources :community_events,  only: [:index, :show, :create, :update, :destroy]
    resources :community_listings, only: [:index, :show, :create, :update, :destroy] do
      member do
        post :fulfill
        post :close
      end
      resources :interests, only: [:create, :destroy],
                            controller: 'community_listing_interests' do
        member do
          put :select
          put :dismiss
        end
      end
    end

    # ── Community Visits — "When I'll Be In Town" ───────────────────────────
    resources :community_visits, only: [:index, :show, :create, :update, :destroy] do
      collection do
        get  :mine
        get  :heatmap
        get  :admin_all
        get  :admin_stats
      end
      member do
        post :notify_friends
      end
    end
    resources :community_my_people,   only: [:index, :create, :destroy]
    resources :community_locations,    only: [:index, :create, :update, :destroy]
    resource  :community_notification_preferences, only: [:show, :update]
    resources :community_visit_notifications, only: [:index] do
      collection do
        get  :unread_count
        post :read_all
      end
      member do
        post :read
      end
    end
    # Community Directory admin API
    get   'community_directory/categories',           to: 'community_directory#categories'
    get   'community_directory/categories/:name',     to: 'community_directory#show_category'
    post  'community_directory/generate',             to: 'community_directory#generate'
    patch 'community_directory/categories/:name',     to: 'community_directory#update_category'
    # Moderation queue
    get   'community_directory/moderation',           to: 'community_directory#moderation_index'
    put   'community_directory/moderation/approve',   to: 'community_directory#moderation_approve'
    put   'community_directory/moderation/reject',    to: 'community_directory#moderation_reject'
    # Permissions
    get    'community_directory/permissions',          to: 'community_directory#permissions_index'
    post   'community_directory/permissions',          to: 'community_directory#permissions_create'
    delete 'community_directory/permissions/:id',      to: 'community_directory#permissions_destroy'
    # Category settings
    get   'community_directory/settings',             to: 'community_directory#settings_index'
    put   'community_directory/settings/:category_key', to: 'community_directory#settings_update'
    get   'community_directory/duplicate_check',      to: 'community_directory#duplicate_check'
    get   'community_directory/scraper_logs',         to: 'community_directory#scraper_logs'
    # Admin entry management
    get    'community_directory/admin_entries',        to: 'community_directory#admin_entries'
    delete 'community_directory/admin_entries/:id',    to: 'community_directory#admin_delete_entry'

    get   'community_landing',  to: 'community_landing#show'
    patch 'community_landing',  to: 'community_landing#update'

    # Community maintenance console (admin only)
    get    'community_maintenance/stats',         to: 'community_maintenance#stats'
    delete 'community_maintenance/past_events',   to: 'community_maintenance#past_events'
    delete 'community_maintenance/stale_listings',to: 'community_maintenance#stale_listings'
    delete 'community_maintenance/past_visits',   to: 'community_maintenance#past_visits'
    delete 'community_maintenance/scraper_logs',  to: 'community_maintenance#scraper_logs'
    post   'community_maintenance/run_scraper',   to: 'community_maintenance#run_scraper'
    post   'community_maintenance/run_all_scrapers', to: 'community_maintenance#run_all_scrapers'
    post   'community_maintenance/run_vacuum',    to: 'community_maintenance#run_vacuum'
    # Community Directory public API
    resources :community_directory_public, only: [:index]
    resources :statuses, only: [:index, :create, :show, :update, :destroy] do
      scope module: :statuses do
        resources :reblogged_by, controller: :reblogged_by_accounts, only: :index
        resources :favourited_by, controller: :favourited_by_accounts, only: :index
        resource :reblog, only: :create
        post :unreblog, to: 'reblogs#destroy'

        resources :quotes, only: :index do
          member do
            post :revoke
          end
        end

        resource :favourite, only: :create
        post :unfavourite, to: 'favourites#destroy'

        resource :bookmark, only: :create
        post :unbookmark, to: 'bookmarks#destroy'

        resource :mute, only: :create
        post :unmute, to: 'mutes#destroy'

        resource :pin, only: :create
        post :unpin, to: 'pins#destroy'

        resource :history, only: :show
        resource :source, only: :show

        resource :interaction_policy, only: :update

        post :translate, to: 'translations#create'
      end

      member do
        get :context
      end
    end

    namespace :timelines do
      resource :direct, only: :show, controller: :direct
      resource :home, only: :show, controller: :home
      resource :public, only: :show, controller: :public
      resource :link, only: :show, controller: :link
      resources :tag, only: :show
      resources :list, only: :show
    end

    with_options to: 'streaming#index' do
      get '/streaming'
      get '/streaming/(*any)'
    end

    resources :custom_emojis, only: [:index]
    resources :suggestions, only: [:index, :destroy]
    resources :scheduled_statuses, only: [:index, :show, :update, :destroy]
    resources :preferences, only: [:index]
    resources :donation_campaigns, only: [:index]

    resources :annual_reports, only: [:index, :show] do
      member do
        post :read
        post :generate
        get :state
      end
    end

    resources :announcements, only: [:index] do
      scope module: :announcements do
        resources :reactions, only: [:update, :destroy]
      end

      member do
        post :dismiss
      end
    end

    resources :conversations, only: [:index, :destroy] do
      member do
        post :read
        post :unread
      end
    end

    resources :media, only: [:create, :update, :show, :destroy]
    resources :blocks, only: [:index]
    resources :mutes, only: [:index]
    resources :favourites, only: [:index]
    resources :bookmarks, only: [:index]
    resources :reports, only: [:create]
    resources :trends, only: [:index], controller: 'trends/tags'
    resources :filters, only: [:index, :create, :show, :update, :destroy]
    resources :endorsements, only: [:index]
    resources :markers, only: [:index, :create]

    resource :profile, only: [:show, :update] do
      scope module: :profile do
        resource :avatar, only: :destroy
        resource :header, only: :destroy
      end
    end

    namespace :apps do
      get :verify_credentials, to: 'credentials#show'
    end

    resources :apps, only: [:create]

    namespace :trends do
      resources :tags, only: [:index]
      resources :links, only: [:index]
      resources :statuses, only: [:index]
    end

    namespace :emails do
      resources :confirmations, only: [:create]
      get :check_confirmation, to: 'confirmations#check'
    end

    resource :instance, only: [:show] do
      scope module: :instances do
        resources :peers, only: [:index]
        resources :rules, only: [:index]
        resources :domain_blocks, only: [:index]
        resources :terms_of_service, only: [:index, :show], param: :date

        resource :privacy_policy, only: [:show]
        resource :extended_description, only: [:show]
        resource :translation_languages, only: [:show]
        resource :languages, only: [:show]
        resource :activity, only: [:show], controller: :activity
      end
    end

    namespace :peers do
      get :search, to: 'search#index'
    end

    namespace :domain_blocks do
      resource :preview, only: [:show]
    end

    resource :domain_blocks, only: [:show, :create, :destroy]

    resource :directory, only: [:show]

    resources :follow_requests, only: [:index] do
      member do
        post :authorize
        post :reject
      end
    end

    namespace :notifications do
      resources :requests, only: [:index, :show] do
        collection do
          post :accept, to: 'requests#accept_bulk'
          post :dismiss, to: 'requests#dismiss_bulk'
          get :merged, to: 'requests#merged?'
        end

        member do
          post :accept
          post :dismiss
        end
      end

      resource :policy, only: [:show, :update]
    end

    resources :notifications, only: [:index, :show, :destroy] do
      collection do
        post :clear
        delete :destroy_multiple
        get :unread_count
      end

      member do
        post :dismiss
      end
    end

    namespace :accounts do
      get :verify_credentials, to: 'credentials#show'
      patch :update_credentials, to: 'credentials#update'
      resource :search, only: :show, controller: :search
      resource :lookup, only: :show, controller: :lookup
      resources :relationships, only: :index
      resources :familiar_followers, only: :index
    end

    resources :accounts, only: [:index, :create, :show] do
      scope module: :accounts do
        resources :statuses, only: :index
        resources :followers, only: :index, controller: :follower_accounts
        resources :following, only: :index, controller: :following_accounts
        resources :lists, only: :index
        resources :identity_proofs, only: :index
        resources :featured_tags, only: :index
        resources :endorsements, only: :index
        resources :email_subscriptions, only: :create
      end

      member do
        post :follow
        post :unfollow
        post :remove_from_followers
        post :block
        post :unblock
        post :mute
        post :unmute
      end

      scope module: :accounts do
        post :pin, to: 'endorsements#create'
        post :endorse, to: 'endorsements#create'
        post :unpin, to: 'endorsements#destroy'
        post :unendorse, to: 'endorsements#destroy'
        resource :note, only: :create
      end
    end

    resources :tags, only: [:show] do
      member do
        post :follow
        post :unfollow
        post :feature
        post :unfeature
      end
    end

    resources :followed_tags, only: [:index]

    resources :lists, only: [:index, :create, :show, :update, :destroy] do
      resource :accounts, only: [:show, :create, :destroy], module: :lists
    end

    namespace :featured_tags do
      resources :suggestions, only: :index
    end

    resources :featured_tags, only: [:index, :create, :destroy]

    resources :polls, only: [:show] do
      resources :votes, only: :create, module: :polls
    end

    namespace :push do
      resource :subscription, only: [:create, :show, :update, :destroy]
    end

    namespace :admin do
      resources :accounts, only: [:index, :show, :destroy] do
        member do
          post :enable
          post :unsensitive
          post :unsilence
          post :unsuspend
          post :approve
          post :reject
        end

        resource :action, only: [:create], controller: 'account_actions'
      end

      resources :reports, only: [:index, :update, :show] do
        member do
          post :assign_to_self
          post :unassign
          post :reopen
          post :resolve
        end
      end

      resources :domain_allows, only: [:index, :show, :create, :destroy]
      resources :domain_blocks, only: [:index, :show, :update, :create, :destroy]
      resources :email_domain_blocks, only: [:index, :show, :create, :destroy]
      resources :ip_blocks, only: [:index, :show, :update, :create, :destroy]

      namespace :trends do
        concern :approvable do
          member do
            post :approve
            post :reject
          end
        end
        with_options only: [:index], concerns: :approvable do
          resources :tags
          resources :links
          resources :statuses
        end

        namespace :links do
          resources :preview_card_providers, only: [:index], path: :publishers, concerns: :approvable
        end
      end

      post :measures, to: 'measures#create'
      post :dimensions, to: 'dimensions#create'
      post :retention, to: 'retention#create'

      resources :canonical_email_blocks, only: [:index, :create, :show, :destroy] do
        collection do
          post :test
        end
      end

      resources :tags, only: [:index, :show, :update]
    end
  end

  namespace :v2 do
    get '/search', to: 'search#index', as: :search

    resources :media, only: [:create]
    resources :suggestions, only: [:index]
    resource :instance, only: [:show]
    resources :filters, only: [:index, :create, :show, :update, :destroy] do
      scope module: :filters do
        resources :keywords, only: [:index, :create]
        resources :statuses, only: [:index, :create]
      end
    end

    namespace :filters do
      resources :keywords, only: [:show, :update, :destroy]
      resources :statuses, only: [:show, :destroy]
    end

    namespace :admin do
      resources :accounts, only: [:index]
    end

    namespace :notifications do
      resource :policy, only: [:show, :update]
    end

    resources :notifications, param: :group_key, only: [:index, :show] do
      collection do
        post :clear
        get :unread_count
      end

      member do
        post :dismiss
      end

      resources :accounts, only: [:index], module: :notifications
    end
  end

  namespace :web do
    resource :settings, only: [:update]
    resources :embeds, only: [:show]
    resources :push_subscriptions, only: [:create, :destroy, :update]
  end
end
