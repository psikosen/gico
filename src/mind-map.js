// Mind Map Visualization
import * as d3 from 'd3';
import { invoke } from './tauri-bridge.js';
import logger from './logger.js';

// State
let simulation = null;
let transform = { x: 0, y: 0, k: 1 };
let svg = null;
let g = null;
let zoom = null;

// Initialize D3 selections
export function initializeD3(svgId, containerId) {
    svg = d3.select(`#${svgId}`);
    g = d3.select(`#${containerId}`);
    
    // Create zoom behavior
    zoom = d3.zoom()
        .scaleExtent([0.1, 3])
        .on('zoom', (event) => {
            transform = event.transform;
            g.attr('transform', event.transform);
        });
    
    svg.call(zoom);
    
    return { svg, g, zoom };
}

// Create mind map visualization
export async function createMindMap(conversations, links, tagFilter = null) {
    if (!svg || !g) {
        console.error('D3 selections not initialized');
        return;
    }
    
    if (conversations.length === 0) {
        showEmptyMapMessage();
        return;
    }
    
    // Clear previous content
    g.selectAll('*').remove();
    
    // Filter conversations if a tag is selected
    let filteredConversations = conversations;
    let filteredLinks = links;
    
    if (tagFilter) {
        try {
            // Get all conversation IDs with the selected tag
            const result = await invoke('read_query', {
                query: `
                    SELECT conversation_id
                    FROM Tags
                    WHERE name = ?
                `,
                parameters: [tagFilter]
            });
            
            const taggedConversationIds = new Set(result.map(row => row.conversation_id));
            
            // Filter conversations
            filteredConversations = conversations.filter(conv => 
                taggedConversationIds.has(conv.id)
            );
            
            // Filter links to only include tagged conversations
            filteredLinks = links.filter(link => 
                taggedConversationIds.has(link.source_conversation_id) && 
                taggedConversationIds.has(link.target_conversation_id)
            );
        } catch (error) {
            console.error('Error filtering mind map by tag:', error);
        }
    }
    
    // Render the mind map
    renderMindMap(filteredConversations, filteredLinks);
}

// Render mind map with nodes and links
function renderMindMap(nodes, links) {
    // Prepare data for D3 force layout
    const nodeData = nodes.map(conv => ({
        id: conv.id,
        title: conv.title,
        lastUpdate: conv.updated_at,
        bookmarked: conv.bookmarked,
        type: 'conversation'
    }));
    
    const linkData = links.map(link => ({
        source: link.source_conversation_id,
        target: link.target_conversation_id,
        type: 'conversation'
    }));
    
    // Create force simulation
    simulation = d3.forceSimulation(nodeData)
        .force('link', d3.forceLink(linkData).id(d => d.id).distance(150))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(svg.node().clientWidth / 2, svg.node().clientHeight / 2))
        .force('collision', d3.forceCollide().radius(60)) // Increased radius for better spacing
        .on('tick', ticked);
    
    // Add definitions for filters and effects
    const defs = g.append('defs');
    
    // Add blur filter
    const blurFilter = defs.append('filter')
        .attr('id', 'blur')
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');
        
    blurFilter.append('feGaussianBlur')
        .attr('in', 'SourceGraphic')
        .attr('stdDeviation', '3');
    
    // Add glow filter
    const glowFilter = defs.append('filter')
        .attr('id', 'glow')
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');
        
    glowFilter.append('feGaussianBlur')
        .attr('stdDeviation', '5')
        .attr('result', 'coloredBlur');
        
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode')
        .attr('in', 'coloredBlur');
    feMerge.append('feMergeNode')
        .attr('in', 'SourceGraphic');
    
    // Create links
    const link = g.selectAll('.map-link')
        .data(linkData)
        .enter()
        .append('line')
        .attr('class', 'map-link')
        .attr('stroke-width', 2);
    
    // Create nodes
    const node = g.selectAll('.map-node')
        .data(nodeData)
        .enter()
        .append('g')
        .attr('class', 'map-node')
        .attr('data-id', d => d.id)
        .attr('data-type', d => d.type);
    
    // Add shadow circle
    node.append('circle')
        .attr('r', 47)
        .attr('fill', 'rgba(0, 0, 0, 0.3)')
        .attr('cx', 2)
        .attr('cy', 2)
        .attr('class', 'node-shadow');
    
    // Add main glassmorphic circle
    node.append('circle')
        .attr('r', 45)
        .attr('fill', d => d.type === 'tag' ? 'rgba(80, 227, 194, 0.3)' : 'rgba(74, 144, 226, 0.3)')
        .attr('stroke', 'rgba(255, 255, 255, 0.2)')
        .attr('stroke-width', 1)
        .attr('class', 'glass-circle')
        .each(function(d) {
            // If it's a conversation node, check for messages
            if (d.type === 'conversation') {
                const circle = d3.select(this);
                console.log(`Checking for messages in conversation ${d.id}`);
                // Check for messages
                invoke('read_query', {
                    query: `
                        SELECT COUNT(*) as count 
                        FROM Messages 
                        WHERE conversation_id = ?
                    `,
                    parameters: [d.id.toString()]
                }).then(result => {
                    console.log(`Message count for conversation ${d.id}:`, result);
                    if (result && result[0] && result[0].count > 0) {
                        // Has messages, set to purple
                        console.log(`Setting conversation ${d.id} to purple (has ${result[0].count} messages)`);
                        circle.attr('fill', 'rgba(128, 0, 128, 0.5)')
                              .attr('filter', 'url(#glow)');
                    }
                }).catch(err => {
                    logger.error('Error checking for messages:', err);
                });
            }
        });
    
    // Add inner highlight
    node.append('circle')
        .attr('r', 42)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255, 255, 255, 0.1)')
        .attr('stroke-width', 1)
        .attr('class', 'inner-highlight');
    
    // Add text to nodes
    node.append('text')
        .attr('dy', 0)
        .text(d => {
            // Truncate long titles
            return d.title.length > 15 ? d.title.substring(0, 15) + '...' : d.title;
        });
    
    // Add bookmark indicators
    node.filter(d => d.bookmarked)
        .append('text')
        .attr('class', 'bookmark-indicator')
        .attr('x', 25)
        .attr('y', -30)
        .attr('font-size', '14px')
        .attr('fill', '#FFD700')
        .attr('text-anchor', 'middle')
        .text('★');
    
    // Add click handlers to nodes
    node.style('cursor', 'pointer')
        .on('click', function(event, d) {
            // Dispatch a custom event that the main app can listen for
            const clickEvent = new CustomEvent('node-clicked', { 
                detail: { conversationId: d.id }
            });
            window.dispatchEvent(clickEvent);
        });
    
    // Add drag behavior
    node.call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));
    
    // Add tag indicators and tag names to conversations with tags
    addTagsToNodes(node);
    
    // Tick function to update positions
    function ticked() {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node
            .attr('transform', d => `translate(${d.x}, ${d.y})`);
    }
    
    // Drag functions
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }
    
    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

// Add tags to nodes
async function addTagsToNodes(nodes) {
    nodes.each(function(d) {
        if (d.type === 'conversation') {
            // Check if this conversation has tags
            invoke('read_query', {
                query: `
                    SELECT name
                    FROM Tags
                    WHERE conversation_id = ?
                `,
                parameters: [d.id.toString()]
            }).then(result => {
                if (result.length > 0) {
                    // Add tag names below node
                    const tagNames = d3.select(this).append('g')
                        .attr('class', 'tag-names')
                        .attr('transform', 'translate(0, 55)');
                    
                    // Show up to 3 tags, with ellipsis if more
                    const displayTags = result.slice(0, 3);
                    displayTags.forEach((tag, i) => {
                        tagNames.append('text')
                            .attr('y', i * 15)
                            .attr('text-anchor', 'middle')
                            .text(`#${tag.name}`);
                    });
                    
                    if (result.length > 3) {
                        tagNames.append('text')
                            .attr('y', 3 * 15)
                            .attr('text-anchor', 'middle')
                            .text('...');
                    }
                    
                    // Add a small tag indicator
                    d3.select(this).append('circle')
                        .attr('class', 'tag-indicator')
                        .attr('r', 8)
                        .attr('cx', 25)
                        .attr('cy', -25)
                        .attr('fill', 'rgba(80, 227, 194, 0.9)')
                        .attr('stroke', 'white')
                        .attr('stroke-width', 1);
                    
                    // Add tag count
                    d3.select(this).append('text')
                        .attr('class', 'tag-count')
                        .attr('x', 25)
                        .attr('y', -25)
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'central')
                        .attr('font-size', '10px')
                        .attr('fill', 'white')
                        .text(result.length);
                }
            }).catch(error => {
                console.error('Error checking for tags:', error);
            });
        }
    });
}

// Show empty map message
function showEmptyMapMessage() {
    g.selectAll('*').remove();
    
    g.append('text')
        .attr('x', svg.node().clientWidth / 2)
        .attr('y', svg.node().clientHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '18px')
        .text('No conversations yet. Click the + button to create one!');
}

// Highlight selected node
export function highlightNode(conversationId) {
    // Remove previous selection
    d3.selectAll('.map-node').classed('selected', false);
    d3.selectAll('.map-link').classed('highlighted', false);
    
    // Add selected class to current node
    const selectedNode = d3.select(`.map-node[data-id="${conversationId}"]`);
    selectedNode.classed('selected', true);
    
    // Return the selected node data for further processing
    return selectedNode.datum();
}

// Highlight links connected to a node
export function highlightConnectedLinks(conversationId, links) {
    const connectedLinks = links.filter(
        link => link.source_conversation_id === conversationId || 
                link.target_conversation_id === conversationId
    );
    
    connectedLinks.forEach(link => {
        d3.selectAll('.map-link')
            .filter(d => 
                (d.source.id === link.source_conversation_id && 
                 d.target.id === link.target_conversation_id) ||
                (d.source.id === link.target_conversation_id && 
                 d.target.id === link.source_conversation_id)
            )
            .classed('highlighted', true);
    });
}

// Zoom to specific node
export function zoomToNode(conversationId) {
    const node = d3.select(`.map-node[data-id="${conversationId}"]`);
    if (!node.empty()) {
        // Get node's position data
        const nodeData = node.datum();
        if (nodeData && nodeData.x && nodeData.y) {
            // Calculate center position of the viewport
            const width = svg.node().clientWidth;
            const height = svg.node().clientHeight;
            
            // Calculate new transform
            const scale = 1.5; // Zoom level
            const x = width / 2 - nodeData.x * scale;
            const y = height / 2 - nodeData.y * scale;
            
            // Apply transform with transition
            svg.transition().duration(750).call(
                zoom.transform,
                d3.zoomIdentity
                    .translate(x, y)
                    .scale(scale)
            );
            
            // Update our saved transform
            transform = { x, y, k: scale };
        }
    }
}

// Zoom map by scale factor
export function zoomMap(scale) {
    const newScale = transform.k * scale;
    if (newScale < 0.1 || newScale > 3) return;
    
    svg.transition().duration(300).call(
        zoom.transform,
        d3.zoomIdentity
            .translate(transform.x, transform.y)
            .scale(newScale)
    );
}

// Reset map view
export function resetMapView() {
    svg.transition().duration(500).call(
        zoom.transform,
        d3.zoomIdentity
    );
}

// Force layout stopped
export function stopSimulation() {
    if (simulation) {
        simulation.stop();
    }
}

// Restart simulation with adjusted parameters
export function restartSimulation() {
    if (simulation) {
        simulation.alpha(0.3).restart();
    }
}
