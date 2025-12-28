<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { data, children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Embebot Dashboard</title>
</svelte:head>

<div class="app">
	<main>
		{@render children()}
	</main>
</div>

<style>
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(:root) {
		--bg: #0a0a0a;
		--fg: #e8e8e8;
		--fg-dim: #666;
		--accent: #fff;
	}

	:global(html, body) {
		font-family: 'Space Mono', monospace;
		background: var(--bg);
		color: var(--fg);
		min-height: 100%;
		height: 100%;
	}

	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	main {
		flex: 1;
		max-width: 1400px;
		width: 100%;
		margin: 0 auto;
		padding: 2rem;
	}
</style>
