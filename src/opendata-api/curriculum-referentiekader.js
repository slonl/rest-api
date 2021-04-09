module.exports = {
	context: 'referentiekader',
	jsonld: 'https://opendata.slo.nl/curriculum/schemas/referentiekader.jsonld',
	schema: 'https://opendata.slo.nl/curriculum/schemas/curriculum-referentiekader/context.json',
	queries: {
		RefVakleergebied: `query RefVakleergebied($page:Int, $perPage:Int) {
			allRefVakleergebied(page:$page, perPage:$perPage, sortField:"prefix") {
				id
				prefix
				title
				unreleased
				Vakleergebied {
						id
						title
				}
				NiveauIndex {
					Niveau {
						...NiveauShort
					}
				}
			}
			_allRefVakleergebiedMeta {
				count
			}
		}`,
		RefDomein: `query RefDomein($page:Int, $perPage:Int) {
			allRefDomein(page:$page, perPage:$perPage, sortField:"prefix") {
				id
				prefix
				title
				unreleased
				RefVakleergebied{
					Vakleergebied {
							id
							title
					}
				}
				NiveauIndex {
					Niveau {
						...NiveauShort
					}
				}
			}
			_allRefDomeinMeta {
				count
			}
		}`,
		RefSubdomein: `query RefSubdomein($page:Int, $perPage:Int) {
			allRefSubdomein(page:$page, perPage:$perPage, sortField:"prefix") {
				id
				prefix
				title
				unreleased
				RefDomein { 
					RefVakleergebied {
						Vakleergebied {
								id
								title
						}
					}
				}
				NiveauIndex {
					Niveau {
						...NiveauShort
					}
				}
			}
			_allRefSubdomeinMeta {
				count
			}
		}`,
		RefOnderwerp: `query RefOnderwerp($page:Int, $perPage:Int) {
			allRefOnderwerp(page:$page, perPage:$perPage, sortField:"prefix") {
				id
				prefix
				title
				unreleased
				RefSubdomein {
					RefDomein {
						RefVakleergebied{
							Vakleergebied {
									id
									title
							}
						}
					}
				}
				NiveauIndex {
					Niveau {
						...NiveauShort
					}
				}
			}
			_allRefOnderwerpMeta {
				count
			}
		}`,
		RefDeelonderwerp: `query RefDeelonderwerp($page:Int, $perPage:Int) {
			allRefDeelonderwerp(page:$page, perPage:$perPage, sortField:"prefix") {
				id
				prefix
				title
				unreleased
				RefOnderwerp {
					RefSubdomein {
						RefDomein {
							RefVakleergebied{
								Vakleergebied {
										id
										title
								}
							}
						}
					}
				}
				NiveauIndex {
					Niveau {
						...NiveauShort
					}
				}
			}
			_allRefDeelonderwerpMeta {
				count
			}
		}`,
		RefTekstkenmerk: `query RefTekstkenmerk($page:Int, $perPage:Int) {
			allRefTekstkenmerk(page:$page, perPage:$perPage, sortField:"prefix") {
				id
				prefix
				title
				unreleased
				RefOnderwerp {
					RefSubdomein {
						RefDomein {
							RefVakleergebied{
								Vakleergebied {
										id
										title
								}
							}
						}
					}
				}
				NiveauIndex {
					Niveau {
						...NiveauShort
					}
				}
			}
			_allRefTekstkenmerkMeta {
				count
			}
		}`
	},
	idQuery: `
		allRefVakleergebied(filter:{id:$id}) {
			id
			prefix
			title
			RefDomein {
				id
				prefix
				title
			}
			Doelniveau {
				...DoelNiveau
			}
			NiveauIndex {
				Niveau {
					...NiveauShort
				}
			}
		}
		allRefDomein(filter:{id:$id}) {
			id
			prefix
			title
			RefSubdomein {
				id
				prefix
				title
			}
			Doelniveau {
				...DoelNiveau
			}
			NiveauIndex {
				Niveau {
					...NiveauShort
				}
			}
		}
		allRefSubdomein(filter:{id:$id}) {
			id
			prefix
			title
			RefOnderwerp {
				id
				prefix
				title
			}
			Doelniveau {
				...DoelNiveau
			}
			NiveauIndex {
				Niveau {
					...NiveauShort
				}
			}
		}
		allRefOnderwerp(filter:{id:$id}) {
			id
			prefix
			title
			RefDeelonderwerp {
				id
				prefix
				title
			}
			RefTekstkenmerk {
				id
				prefix
				title
			}
			Doelniveau {
				...DoelNiveau
			}
			NiveauIndex {
				Niveau {
					...NiveauShort
				}
			}
		}
		allRefDeelonderwerp(filter:{id:$id}) {
			id
			prefix
			title
			Doelniveau {
				...DoelNiveau
			}
			NiveauIndex {
				Niveau {
					...NiveauShort
				}
			}
		}
		allRefTekstkenmerk(filter:{id:$id}) {
			id
			prefix
			title
			Doelniveau {
				...DoelNiveau
			}
			NiveauIndex {
				Niveau {
					...NiveauShort
				}
			}
		}
	`,
	routes: {
		'ref_vakleergebied/': (req) =>
			opendata.api["RefVakleergebied"](req.params, req.query)
			.then(function(result) {
				return { data: result.data.allRefVakleergebied, type: 'RefVakleergebied', meta: result.data._allRefVakleergebiedMeta}
			}),
		'ref_domein/': (req) =>
			opendata.api["RefDomein"](req.params, req.query)
			.then(function(result) {
				return { data: result.data.allRefDomein, type: 'RefDomein', meta: result.data._allRefDomeinMeta}
			}),
		'ref_subdomein/': (req) =>
			opendata.api["RefSubdomein"](req.params, req.query)
			.then(function(result) {
				return { data: result.data.allRefSubdomein, type: 'RefSubdomein', meta: result.data._allRefSubdomeinMeta}
			}),
		'ref_onderwerp/': (req) =>
			opendata.api["RefOnderwerp"](req.params, req.query)
			.then(function(result) {
				return { data: result.data.allRefOnderwerp, type: 'RefOnderwerp', meta: result.data._allRefOnderwerpMeta}
			}),
		'ref_deelonderwerp/': (req) =>
			opendata.api["RefDeelonderwerp"](req.params, req.query)
			.then(function(result) {
				return { data: result.data.allRefDeelonderwerp, type: 'RefDeelonderwerp', meta: result.data._allRefDeelonderwerpMeta}
			}),
		'ref_tekstkenmerk/': (req) =>
			opendata.api["RefTekstkenmerk"](req.params, req.query)
			.then(function(result) {
				return { data: result.data.allRefTekstkenmerk, type: 'RefTekstkenmerk', meta: result.data._allRefTekstkenmerkMeta}
			})
	}
};