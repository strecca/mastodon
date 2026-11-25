# frozen_string_literal: true

require 'rails_helper'

# Guards against a worker's queue silently not being listened to. On 2026-07-12 the
# push and pull queues were dropped from config/sidekiq.yml as "federation only", which
# left account deletion, suspensions, archive exports, link previews and browser push
# notifications enqueued forever with no error anywhere.
RSpec.describe 'config/sidekiq.yml queues' do # rubocop:disable RSpec/DescribeClass -- checks a config file, not a class
  # Queues this closed (non-federated) site deliberately does not process.
  let(:intentionally_unlistened) { %w(ingress fasp) }

  let(:listened_queues) do
    config = YAML.safe_load(ERB.new(Rails.root.join('config', 'sidekiq.yml').read).result, permitted_classes: [Symbol])
    config[:queues].map { |entry| Array(entry).first.to_s }
  end

  let(:worker_queues) do
    Rails.application.eager_load!
    # Module#name directly: some classes define their own `.name` with required arguments
    class_name = Module.instance_method(:name)
    jobs = ObjectSpace.each_object(Class).select { |klass| class_name.bind_call(klass) && klass < Sidekiq::Job }
    jobs.to_h { |klass| [class_name.bind_call(klass), klass.get_sidekiq_options['queue'].to_s] }
  end

  it 'listens to the queue of every worker, except the deliberately unused ones' do
    orphaned = worker_queues.reject { |_, queue| listened_queues.include?(queue) || intentionally_unlistened.include?(queue) }

    expect(orphaned).to be_empty
  end

  it 'still listens to push and pull, which carry local (non-federation) work' do
    expect(listened_queues).to include('push', 'pull')
    expect(worker_queues).to include('AccountDeletionWorker' => 'pull', 'Web::PushNotificationWorker' => 'push', 'LinkCrawlWorker' => 'pull')
  end
end
