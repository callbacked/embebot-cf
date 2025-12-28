<script lang="ts">
	import { onMount } from 'svelte';

	let { data } = $props();

	const platforms = [
		{ name: 'twitter.com', fixed: 'vxtwitter.com', color: '#1da1f2' },
		{ name: 'x.com', fixed: 'vxtwitter.com', color: '#fff' },
		{ name: 'tiktok.com', fixed: 'vxtiktok.com', color: '#ff0050' },
		{ name: 'instagram.com', fixed: 'ddinstagram.com', color: '#e1306c' },
		{ name: 'reddit.com', fixed: 'vxreddit.com', color: '#ff4500' }
	];

	let currentPlatform = $state(0);
	let typedDomain = $state('');
	let showUserMsg = $state(false);
	let showBotMsg = $state(false);
	let typingInterval: ReturnType<typeof setInterval> | null = null;

	function typeText(text: string, onComplete: () => void) {
		// Clear any existing typing animation
		if (typingInterval) {
			clearInterval(typingInterval);
			typingInterval = null;
		}

		typedDomain = '';
		let i = 0;
		typingInterval = setInterval(() => {
			if (i < text.length) {
				typedDomain += text[i];
				i++;
			} else {
				if (typingInterval) {
					clearInterval(typingInterval);
					typingInterval = null;
				}
				onComplete();
			}
		}, 50);
	}

	onMount(() => {
		// Initial: show user message and type first domain
		setTimeout(() => {
			showUserMsg = true;
			typeText(platforms[0].name, () => {
				setTimeout(() => { showBotMsg = true; }, 500);
			});
		}, 300);

		// Cycle through platforms
		const interval = setInterval(() => {
			// Hide bot message
			showBotMsg = false;

			// After bot fades out, change platform and type new domain
			setTimeout(() => {
				currentPlatform = (currentPlatform + 1) % platforms.length;
				typeText(platforms[currentPlatform].name, () => {
					// Show new bot response
					setTimeout(() => { showBotMsg = true; }, 400);
				});
			}, 400);
		}, 4000);

		return () => {
			clearInterval(interval);
			if (typingInterval) {
				clearInterval(typingInterval);
			}
		};
	});
</script>

<div class="landing">
	<div class="hero">
		<p class="tagline">discord embeds suck most of the time :\</p>
		<p class="tagline-alt">embebot tries to help</p>

		<div class="demo-section">
			<div class="platform-list">
				<div class="platform-scroll">
					<span class="platform-item">twitter</span>
					<span class="platform-item">x</span>
					<span class="platform-item">tiktok</span>
					<span class="platform-item">instagram</span>
					<span class="platform-item">reddit</span>
					<span class="platform-item">twitter</span>
					<span class="platform-item">x</span>
					<span class="platform-item">tiktok</span>
					<span class="platform-item">instagram</span>
					<span class="platform-item">reddit</span>
				</div>
			</div>

			<div class="demo-window">
				<div class="demo-header">
					<span class="demo-dot red"></span>
					<span class="demo-dot yellow"></span>
					<span class="demo-dot green"></span>
				</div>
				<div class="demo-content">
					<!-- User message with broken embed -->
					<div class="message" class:visible={showUserMsg}>
						<div class="message-avatar">U</div>
						<div class="message-body">
							<span class="message-author">user</span>
							<span class="message-text">
								https://<span class="link-domain" style="color: {platforms[currentPlatform].color}">{typedDomain}</span>/video
							</span>
							<div class="embed-broken">
								<span class="embed-x">✕</span>
								<span>embed failed to load</span>
							</div>
						</div>
					</div>

					<!-- Bot reply with fixed embed -->
					<div class="message bot-response" class:visible={showBotMsg}>
						<div class="message-avatar bot">E</div>
						<div class="message-body">
							<span class="message-author bot-name">embebot</span>
							<div class="embed-fixed">
								<div class="embed-bar" style="background: {platforms[currentPlatform].color}"></div>
								<div class="embed-content">
									<span class="embed-site">{platforms[currentPlatform].fixed}</span>
									<span class="embed-title">Now playing</span>
									<div class="embed-thumb">
										<span class="play-icon">▶</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="spacer"></div>
		</div>

		<div class="cta-section">
			<a href="https://discord.com/oauth2/authorize?client_id=1100908930458198098&permissions=274877925376&scope=bot" class="btn primary" target="_blank">
				Add to Discord
			</a>
			{#if data.user}
				<a href="/dashboard" class="btn secondary">Dashboard →</a>
			{:else}
				<a href="/auth/discord" class="btn secondary">Login →</a>
			{/if}
		</div>

		<a href="https://github.com/callbacked/embebot-cf" target="_blank" class="github-link">github</a>
	</div>
</div>

<style>
	.landing {
		display: flex;
		flex-direction: column;
		min-height: calc(100vh - 8rem);
	}

	.hero {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		text-align: center;
		padding: 2rem 0;
	}

	.tagline {
		font-size: 0.9rem;
		color: var(--fg-dim);
		margin-bottom: 0.5rem;
		letter-spacing: 0.02em;
	}

	.tagline-alt {
		font-size: 0.9rem;
		color: var(--fg);
		margin-bottom: 2rem;
		letter-spacing: 0.02em;
	}

	.demo-section {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2rem;
		margin-bottom: 3rem;
	}

	.spacer {
		width: 80px;
	}

	.platform-list {
		height: 6rem;
		overflow: hidden;
		position: relative;
		width: 80px;
		text-align: right;
		mask-image: linear-gradient(to bottom, transparent, black 25%, black 75%, transparent);
		-webkit-mask-image: linear-gradient(to bottom, transparent, black 25%, black 75%, transparent);
	}

	.platform-scroll {
		animation: scroll 6s linear infinite;
	}

	@keyframes scroll {
		0% {
			transform: translateY(0);
		}
		100% {
			transform: translateY(-10rem);
		}
	}

	.platform-item {
		display: block;
		font-size: 0.8rem;
		color: var(--fg-dim);
		height: 2rem;
		line-height: 2rem;
	}

	.demo-window {
		background: #141414;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		width: 480px;
		max-width: 92vw;
		overflow: hidden;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
	}

	.demo-header {
		display: flex;
		gap: 8px;
		padding: 14px 16px;
		background: rgba(255, 255, 255, 0.02);
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.demo-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
	}

	.demo-dot.red { background: #ff5f57; }
	.demo-dot.yellow { background: #febc2e; }
	.demo-dot.green { background: #28c840; }

	.demo-content {
		padding: 1.25rem;
	}

	.message {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1rem;
		opacity: 0;
		transform: translateY(16px);
		transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.message.visible {
		opacity: 1;
		transform: translateY(0);
	}

	.message.bot-response {
		transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.message:last-child {
		margin-bottom: 0;
	}

	.message-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: #2a2a2a;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 600;
		flex-shrink: 0;
		color: #888;
	}

	.message-avatar.bot {
		background: #5865f2;
		color: #fff;
	}

	.message-body {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		text-align: left;
		flex: 1;
	}

	.message-author {
		font-size: 0.85rem;
		font-weight: 500;
	}

	.bot-name {
		color: #5865f2;
	}

	.message-text {
		font-size: 0.9rem;
		color: var(--fg-dim);
	}

	.link-domain {
		font-weight: 500;
	}

	.embed-broken {
		margin-top: 0.5rem;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.03);
		border-left: 3px solid #555;
		font-size: 0.8rem;
		color: #666;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.embed-x {
		color: #f04747;
		font-size: 0.9rem;
	}

	.embed-fixed {
		margin-top: 0.5rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 4px;
		overflow: hidden;
		display: flex;
	}

	.embed-bar {
		width: 4px;
		flex-shrink: 0;
	}

	.embed-content {
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.embed-site {
		font-size: 0.7rem;
		color: var(--fg-dim);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.embed-title {
		font-size: 0.85rem;
		color: var(--fg);
		font-weight: 500;
	}

	.embed-thumb {
		width: 100%;
		height: 70px;
		background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
		border-radius: 4px;
		margin-top: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.play-icon {
		font-size: 1.5rem;
		opacity: 0.5;
	}

	.cta-section {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.btn {
		display: inline-block;
		padding: 0.875rem 1.5rem;
		font-family: 'Space Mono', monospace;
		font-size: 0.75rem;
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.btn.primary {
		background: var(--fg);
		color: var(--bg);
	}

	.btn.primary:hover {
		opacity: 0.85;
	}

	.btn.secondary {
		color: var(--fg-dim);
	}

	.btn.secondary:hover {
		color: var(--fg);
	}

	.github-link {
		margin-top: 2rem;
		font-size: 0.75rem;
		color: var(--fg-dim);
		text-decoration: none;
		opacity: 0.5;
		transition: opacity 0.2s ease;
	}

	.github-link:hover {
		opacity: 1;
	}
</style>
